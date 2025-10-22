<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Company;
use App\Models\Activity;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ContactsController extends Controller
{
    public function index(Request $request)
    {
        $query = Contact::query()->with('company');

        // Sales Users can only view contacts from companies where they are the agent
        $user = auth()->user();
        if (!$user->isAdmin()) {
            $query->whereHas('company', function ($q) use ($user) {
                $q->where('agent_id', $user->id);
            });
        }

        // Master filter - search across all fields
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('title', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone1', 'like', '%' . $search . '%')
                    ->orWhere('phone2', 'like', '%' . $search . '%')
                    ->orWhere('linkedin_url', 'like', '%' . $search . '%')
                    ->orWhereHas('company', function ($companyQuery) use ($search) {
                        $companyQuery->where('name', 'like', '%' . $search . '%');
                    });
            });
        }

        // Interest Level filter
        if ($request->filled('interest_level')) {
            $query->where('interest_level', $request->interest_level);
        }

        // PIC Status filter
        if ($request->filled('pic_status')) {
            if ($request->pic_status === 'pic') {
                $query->where('is_pic', true);
            } elseif ($request->pic_status === 'not_pic') {
                $query->where(function ($q) {
                    $q->where('is_pic', false)
                        ->orWhereNull('is_pic');
                });
            }
        }

        // Apply sorting
        $sortField = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        
        // Map frontend sort column names to database columns/relationships
        switch ($sortField) {
            case 'company_name':
                $query->join('company', 'contact.company_id', '=', 'company.id')
                    ->orderBy('company.name', $sortDirection)
                    ->select('contact.*');
                break;
            case 'name':
            case 'title':
            case 'phone1':
            case 'phone2':
            case 'email':
            case 'is_pic':
            case 'interest_level':
            case 'created_at':
                $query->orderBy($sortField, $sortDirection);
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        // Paginate with 50 items per page for lazy loading
        $contacts = $query->paginate(50)->withQueryString();

        // Get companies for the dropdown
        // Sales Users can only see companies where they are the agent
        $companiesQuery = Company::select('id', 'name')->orderBy('name');
        if (!$user->isAdmin()) {
            $companiesQuery->where('agent_id', $user->id);
        }
        $companies = $companiesQuery->get();

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
            'companies' => $companies,
            'filters' => $request->only(['search', 'interest_level', 'pic_status', 'sort_by', 'sort_direction']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:company,id',
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone1' => 'nullable|string|max:50',
            'phone2' => 'nullable|string|max:50',
            'linkedin_url' => 'nullable|url|max:500',
            'is_pic' => 'nullable|boolean',
            'interest_level' => 'required|in:Cold,Warm,Hot',
        ]);

        // Verify user has access to this company
        $user = auth()->user();
        if (!$user->isAdmin()) {
            $company = Company::where('id', $validated['company_id'])
                ->where('agent_id', $user->id)
                ->first();
            
            if (!$company) {
                abort(403, 'Unauthorized to add contacts to this company');
            }
        }

        // Generate a new ID
        $maxId = Contact::max('id') ?? 0;
        $validated['id'] = $maxId + 1;
        $validated['created_at'] = now()->utc();
        
        // Ensure is_pic is set
        $validated['is_pic'] = $validated['is_pic'] ?? false;

        $contact = Contact::create($validated);

        // Log activity
        $activityMaxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $activityMaxId + 1,
            'agent_id' => auth()->id(),
            'company_id' => $contact->company_id,
            'contact_id' => $contact->id,
            'activity_type' => 'contact_created',
            'notes' => "Contact '{$contact->name}' was created",
            'created_at' => now()->utc(),
        ]);

        return redirect()->route('contacts.index')->with('success', 'Contact created successfully');
    }
}

