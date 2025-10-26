<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\Company;
use App\Models\Activity;
use App\Exports\PartnerCompaniesExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class PartnersController extends Controller
{
    public function index(Request $request)
    {
        // Query for partners with filters
        $partnersQuery = Partner::query()->orderBy('created_at', 'desc');

        // Apply partner filters (for All Partners tab)
        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $partnersQuery->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(name) LIKE ?', ['%' . $search . '%'])
                    ->orWhereRaw('LOWER(email) LIKE ?', ['%' . $search . '%']);
            });
        }

        if ($request->filled('contract_status')) {
            $contractStatuses = is_array($request->contract_status) ? $request->contract_status : [$request->contract_status];
            $partnersQuery->whereIn('contract_status', $contractStatuses);
        }

        // Paginate partners with 50 items per page
        $partners = $partnersQuery->paginate(50, ['*'], 'partners_page')->withQueryString();

        // Get all partners for filter dropdown (non-paginated)
        $allPartners = Partner::orderBy('name', 'asc')->get();

        // Get companies with partner assignments
        $companiesQuery = Company::query()
            ->with(['partner', 'agent'])
            ->whereNotNull('partner_id');

        // Apply filters for partner companies (supports single value or array)
        if ($request->filled('partner_id')) {
            $partnerIds = is_array($request->partner_id) ? $request->partner_id : [$request->partner_id];
            $companiesQuery->whereIn('partner_id', $partnerIds);
        }

        if ($request->filled('stage')) {
            $stages = is_array($request->stage) ? $request->stage : [$request->stage];
            $companiesQuery->whereIn('stage', $stages);
        }

        // Paginate with 50 items per page for lazy loading
        $partnerCompanies = $companiesQuery->paginate(50, ['*'], 'companies_page')->withQueryString();

        // Get unique stages for filter
        $stages = Company::distinct()->pluck('stage')->filter()->values();

        return Inertia::render('Partners/Index', [
            'partners' => $partners,
            'partnerCompanies' => $partnerCompanies,
            'allPartners' => $allPartners, // For filter dropdown
            'stages' => $stages,
            'filters' => $request->only(['partner_id', 'stage', 'search', 'contract_status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:200',
            'email' => 'nullable|email|max:200',
            'partnership_model' => 'nullable|string',
            'notes' => 'nullable|string',
            'contract_status' => 'nullable|string|max:50',
        ]);

        // Get next ID
        $maxId = Partner::max('id') ?? 0;
        $validated['id'] = $maxId + 1;

        $partner = Partner::create($validated);

        // Log activity
        $activityMaxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $activityMaxId + 1,
            'agent_id' => auth()->id(),
            'activity_type' => 'partner_created',
            'notes' => "Partner '{$partner->name}' was created",
            'created_at' => now()->utc(),
        ]);

        return redirect()->route('partners.index')->with('success', 'Partner created successfully');
    }

    public function update(Request $request, $id)
    {
        $partner = Partner::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:200',
            'email' => 'nullable|email|max:200',
            'partnership_model' => 'nullable|string',
            'notes' => 'nullable|string',
            'contract_status' => 'nullable|string|max:50',
        ]);

        $oldName = $partner->name;
        $partner->update($validated);

        // Log activity
        $activityMaxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $activityMaxId + 1,
            'agent_id' => auth()->id(),
            'activity_type' => 'partner_updated',
            'notes' => "Partner '{$oldName}' was updated" . ($oldName !== $validated['name'] ? " (renamed to '{$validated['name']}')" : ""),
            'created_at' => now()->utc(),
        ]);

        return redirect()->route('partners.index')->with('success', 'Partner updated successfully');
    }

    public function destroy($id)
    {
        $partner = Partner::findOrFail($id);
        
        // Check if partner has companies
        if ($partner->companies()->count() > 0) {
            return redirect()->route('partners.index')->with('error', 'Cannot delete partner with assigned companies');
        }

        $partnerName = $partner->name;
        $partner->delete();

        // Log activity
        $activityMaxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $activityMaxId + 1,
            'agent_id' => auth()->id(),
            'activity_type' => 'partner_deleted',
            'notes' => "Partner '{$partnerName}' was deleted",
            'created_at' => now()->utc(),
        ]);

        return redirect()->route('partners.index')->with('success', 'Partner deleted successfully');
    }

    public function exportCompanies(Request $request)
    {
        $query = Company::query()
            ->with(['partner', 'agent'])
            ->whereNotNull('partner_id');

        // Apply same filters (supports single value or array)
        if ($request->filled('partner_id')) {
            $partnerIds = is_array($request->partner_id) ? $request->partner_id : [$request->partner_id];
            $query->whereIn('partner_id', $partnerIds);
        }

        if ($request->filled('stage')) {
            $stages = is_array($request->stage) ? $request->stage : [$request->stage];
            $query->whereIn('stage', $stages);
        }

        return Excel::download(
            new PartnerCompaniesExport($query), 
            'partner-companies-' . now()->format('Y-m-d-His') . '.xlsx'
        );
    }
}

