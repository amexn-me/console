<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectsController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Check if user has access to projects (project segment or super_admin)
        if (!$user->isSuperAdmin() && !$user->isProjectSegment()) {
            abort(403, 'Unauthorized action. Only project users and admins can access projects.');
        }
        
        // Build query for projects
        $query = Project::with(['company', 'campaign', 'product', 'agent', 'partner', 'contacts']);

        // Filter by agent if not super admin or segment admin
        if (!$user->isSuperAdmin() && !$user->isAdmin()) {
            $query->where('agent_id', $user->id);
        }

        // Filter by status if specified
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search by company name or project name
        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . $search . '%'])
                  ->orWhereHas('company', function ($q) use ($search) {
                      $q->whereRaw('LOWER(name) LIKE ?', ['%' . $search . '%']);
                  });
            });
        }

        $projects = $query->orderBy('created_at', 'desc')->paginate(50);

        // Get agents list for filters
        if (!$user->isSuperAdmin() && !$user->isAdmin()) {
            $agents = User::where('id', $user->id)->select('id', 'name')->get();
        } else {
            $agents = User::select('id', 'name')->orderBy('name')->get();
        }

        $statuses = ['active', 'on_hold', 'completed', 'cancelled'];

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'agents' => $agents,
            'statuses' => $statuses,
            'filters' => [
                'search' => $request->search,
                'status' => $request->status,
            ],
        ]);
    }

    public function show(Project $project)
    {
        $user = auth()->user();
        
        // Check if user has access to projects
        if (!$user->isSuperAdmin() && !$user->isProjectSegment()) {
            abort(403, 'Unauthorized action. Only project users and admins can access projects.');
        }
        
        // Check if user can view this specific project
        if (!$user->isSuperAdmin() && !$user->isAdmin() && $project->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only view projects where you are the agent.');
        }

        // Load project with relationships
        $project->load([
            'company',
            'campaign',
            'product',
            'agent',
            'partner',
            'lead',
            'contacts',
            'files',
            'contracts'
        ]);

        return Inertia::render('Projects/Show', [
            'project' => $project,
        ]);
    }
}

