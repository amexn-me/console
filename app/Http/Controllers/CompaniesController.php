<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\User;
use App\Models\Activity;
use App\Exports\CompaniesExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class CompaniesController extends Controller
{
    public function index(Request $request)
    {
        $query = Company::query()
            ->with(['agent', 'partner', 'contacts']);

        // Sales Users can only view companies where they are the agent
        $user = auth()->user();
        if (!$user->isAdmin()) {
            $query->where('agent_id', $user->id);
        }

        // Apply filters (supports single value or array)
        if ($request->filled('stage')) {
            $stages = is_array($request->stage) ? $request->stage : [$request->stage];
            $query->whereIn('stage', $stages);
        }

        if ($request->filled('agent_id')) {
            $agentIds = is_array($request->agent_id) ? $request->agent_id : [$request->agent_id];
            $query->whereIn('agent_id', $agentIds);
        }

        if ($request->filled('search')) {
            $query->whereRaw('LOWER(name) like ?', ['%' . strtolower($request->search) . '%']);
        }

        if ($request->filled('pic_status')) {
            $picStatuses = is_array($request->pic_status) ? $request->pic_status : [$request->pic_status];
            
            // Handle multiple PIC status filters
            $query->where(function ($q) use ($picStatuses) {
                foreach ($picStatuses as $status) {
                    if ($status === 'identified') {
                        $q->orWhereHas('contacts', function ($subQ) {
                            $subQ->where('is_pic', true);
                        });
                    } elseif ($status === 'not_identified') {
                        $q->orWhereDoesntHave('contacts', function ($subQ) {
                            $subQ->where('is_pic', true);
                        });
                    }
                }
            });
        }

        if ($request->filled('interest_level')) {
            $interestLevels = is_array($request->interest_level) ? $request->interest_level : [$request->interest_level];
            $query->whereHas('contacts', function ($q) use ($interestLevels) {
                $q->whereIn('interest_level', $interestLevels);
            });
        }

        // Add aggregate data for contacts
        $query->withCount('contacts')
            ->withMax('contacts as highest_interest_level', 'interest_level');

        // Apply sorting
        $sortField = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        
        // Map frontend sort column names to database columns/relationships
        switch ($sortField) {
            case 'agent_name':
                $query->join('users', 'company.agent_id', '=', 'users.id')
                    ->orderBy('users.name', $sortDirection)
                    ->select('company.*');
                break;
            case 'partner_name':
                $query->leftJoin('partner', 'company.partner_id', '=', 'partner.id')
                    ->orderBy('partner.name', $sortDirection)
                    ->select('company.*');
                break;
            case 'contacts_count':
                // This is already handled by withCount, but we need to order by the aggregate
                $query->orderBy('contacts_count', $sortDirection);
                break;
            case 'name':
            case 'stage':
            case 'next_followup_date':
            case 'created_at':
                $query->orderBy($sortField, $sortDirection);
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        // Paginate with 50 items per page for lazy loading
        $companies = $query->paginate(50)->withQueryString();

        // Get filter options
        // Non-admin users should only see themselves in the agent filter
        $user = auth()->user();
        if (!$user->isAdmin()) {
            $agents = User::where('id', $user->id)->select('id', 'name')->get();
        } else {
            $agents = User::select('id', 'name')->orderBy('name')->get();
        }
        
        $stages = Company::distinct()->pluck('stage')->filter()->values();

        return Inertia::render('Companies/Index', [
            'companies' => $companies,
            'agents' => $agents,
            'stages' => $stages,
            'filters' => $request->only(['stage', 'agent_id', 'search', 'pic_status', 'interest_level', 'sort_by', 'sort_direction']),
        ]);
    }

    public function show($id)
    {
        $company = Company::with([
            'agent',
            'partner',
            'contacts' => function ($query) {
                $query->orderBy('is_pic', 'desc')->orderBy('created_at', 'desc');
            },
            'campaigns' => function ($query) {
                $query->withPivot(['id', 'stage', 'agent_id', 'next_followup_date']);
            },
            'proposals' => function ($query) {
                $query->with(['campaign', 'creator'])->orderBy('created_at', 'desc');
            },
            'files' => function ($query) {
                $query->orderBy('uploaded_at', 'desc');
            },
            'activities' => function ($query) {
                $query->with('agent')->orderBy('created_at', 'desc');
            },
            'todos' => function ($query) {
                $query->orderBy('is_completed', 'asc')->orderBy('created_at', 'desc');
            }
        ])->findOrFail($id);

        // Sales Users can only view companies where they are the agent
        $user = auth()->user();
        if (!$user->isAdmin() && $company->agent_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        return Inertia::render('Companies/Show', [
            'company' => $company,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'stage' => 'required|string',
            'agent_id' => 'required|exists:users,id',
        ]);

        // Generate a new ID
        $maxId = Company::max('id') ?? 0;
        $validated['id'] = $maxId + 1;
        $validated['created_at'] = now()->utc();

        $company = Company::create($validated);

        // Log activity
        $activityMaxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $activityMaxId + 1,
            'agent_id' => auth()->id(),
            'company_id' => $company->id,
            'activity_type' => 'company_created',
            'notes' => "Company '{$company->name}' was created",
            'created_at' => now()->utc(),
        ]);

        return redirect()->route('companies.index')->with('success', 'Company created successfully');
    }

    public function export(Request $request)
    {
        $query = Company::query()
            ->with(['agent', 'partner', 'contacts']);

        // Sales Users can only export companies where they are the agent
        $user = auth()->user();
        if (!$user->isAdmin()) {
            $query->where('agent_id', $user->id);
        }

        // Apply same filters as index (supports single value or array)
        if ($request->filled('stage')) {
            $stages = is_array($request->stage) ? $request->stage : [$request->stage];
            $query->whereIn('stage', $stages);
        }

        if ($request->filled('agent_id')) {
            $agentIds = is_array($request->agent_id) ? $request->agent_id : [$request->agent_id];
            $query->whereIn('agent_id', $agentIds);
        }

        if ($request->filled('search')) {
            $query->whereRaw('LOWER(name) like ?', ['%' . strtolower($request->search) . '%']);
        }

        if ($request->filled('pic_status')) {
            $picStatuses = is_array($request->pic_status) ? $request->pic_status : [$request->pic_status];
            
            // Handle multiple PIC status filters
            $query->where(function ($q) use ($picStatuses) {
                foreach ($picStatuses as $status) {
                    if ($status === 'identified') {
                        $q->orWhereHas('contacts', function ($subQ) {
                            $subQ->where('is_pic', true);
                        });
                    } elseif ($status === 'not_identified') {
                        $q->orWhereDoesntHave('contacts', function ($subQ) {
                            $subQ->where('is_pic', true);
                        });
                    }
                }
            });
        }

        if ($request->filled('interest_level')) {
            $interestLevels = is_array($request->interest_level) ? $request->interest_level : [$request->interest_level];
            $query->whereHas('contacts', function ($q) use ($interestLevels) {
                $q->whereIn('interest_level', $interestLevels);
            });
        }

        $query->withCount('contacts')
            ->withMax('contacts as highest_interest_level', 'interest_level');

        $sortField = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortField, $sortDirection);

        return Excel::download(new CompaniesExport($query), 'companies-' . now()->format('Y-m-d-His') . '.xlsx');
    }
}

