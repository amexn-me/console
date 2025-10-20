<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ContractsController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Check if user has access to finance (finance segment or super_admin)
        if (!$user->isSuperAdmin() && !$user->isFinanceSegment()) {
            abort(403, 'Unauthorized action. Only finance users and admins can access contracts.');
        }
        
        // Build query for contracts
        $query = Contract::with(['company', 'campaign', 'product', 'agent', 'partner', 'project', 'contacts']);

        // Filter by agent if not super admin or segment admin
        if (!$user->isSuperAdmin() && !$user->isAdmin()) {
            $query->where('agent_id', $user->id);
        }

        // Filter by status if specified
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search by company name or contract number
        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function($q) use ($search) {
                $q->whereRaw('LOWER(contract_number) LIKE ?', ['%' . $search . '%'])
                  ->orWhereHas('company', function ($q) use ($search) {
                      $q->whereRaw('LOWER(name) LIKE ?', ['%' . $search . '%']);
                  });
            });
        }

        $contracts = $query->orderBy('created_at', 'desc')->paginate(50);

        // Get agents list for filters
        if (!$user->isSuperAdmin() && !$user->isAdmin()) {
            $agents = User::where('id', $user->id)->select('id', 'name')->get();
        } else {
            $agents = User::select('id', 'name')->orderBy('name')->get();
        }

        $statuses = ['draft', 'active', 'completed', 'terminated'];

        return Inertia::render('Finance/Index', [
            'contracts' => $contracts,
            'agents' => $agents,
            'statuses' => $statuses,
            'filters' => [
                'search' => $request->search,
                'status' => $request->status,
            ],
        ]);
    }

    public function show(Contract $contract)
    {
        $user = auth()->user();
        
        // Check if user has access to finance
        if (!$user->isSuperAdmin() && !$user->isFinanceSegment()) {
            abort(403, 'Unauthorized action. Only finance users and admins can access contracts.');
        }
        
        // Check if user can view this specific contract
        if (!$user->isSuperAdmin() && !$user->isAdmin() && $contract->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only view contracts where you are the agent.');
        }

        // Load contract with relationships
        $contract->load([
            'company',
            'campaign',
            'product',
            'agent',
            'partner',
            'project',
            'lead',
            'contacts',
            'files'
        ]);

        return Inertia::render('Finance/Show', [
            'contract' => $contract,
        ]);
    }
}

