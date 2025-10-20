<?php

namespace App\Http\Controllers;

use App\Models\Contact;
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

        // Sort by created_at descending by default
        $query->orderBy('created_at', 'desc');

        // Paginate with 50 items per page for lazy loading
        $contacts = $query->paginate(50)->withQueryString();

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
            'filters' => $request->only(['search', 'interest_level', 'pic_status']),
        ]);
    }
}

