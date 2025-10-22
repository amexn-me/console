<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Models\User;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Todo::with(['user', 'company'])
            ->orderBy('created_at', 'desc');

        // Non-super-admin users can only view their own tasks
        $user = auth()->user();
        if (!$user->isSuperAdmin()) {
            $query->where('user_id', $user->id);
        } else {
            // Super admins can filter by user
            if ($request->has('user_id') && $request->user_id !== 'all') {
                $query->where('user_id', $request->user_id);
            }
        }

        // Filter by company
        if ($request->has('company_id') && $request->company_id !== 'all') {
            $query->where('company_id', $request->company_id);
        }

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'completed') {
                $query->where('is_completed', true);
            } elseif ($request->status === 'pending') {
                $query->where('is_completed', false);
            }
        }

        // Search
        if ($request->has('search') && $request->search) {
            $query->where('task', 'like', '%' . $request->search . '%');
        }

        $todos = $query->paginate(50)->through(fn($todo) => [
            'id' => $todo->id,
            'task' => $todo->task,
            'is_completed' => $todo->is_completed,
            'created_at' => $todo->created_at?->format('Y-m-d H:i:s'),
            'completed_at' => $todo->completed_at?->format('Y-m-d H:i:s'),
            'user' => $todo->user ? [
                'id' => $todo->user->id,
                'name' => $todo->user->name,
            ] : null,
            'company' => $todo->company ? [
                'id' => $todo->company->id,
                'name' => $todo->company->name,
            ] : null,
        ]);

        // Non-super-admin users should only see themselves in the user filter
        $user = auth()->user();
        if (!$user->isSuperAdmin()) {
            $users = User::where('id', $user->id)->select('id', 'name')->get();
            // Non-admin users should only see companies where they are the agent
            $companies = Company::where('agent_id', $user->id)->select('id', 'name')->orderBy('name')->get();
        } else {
            $users = User::select('id', 'name')->orderBy('name')->get();
            $companies = Company::select('id', 'name')->orderBy('name')->get();
        }

        return Inertia::render('Tasks/Index', [
            'todos' => $todos,
            'users' => $users,
            'companies' => $companies,
            'filters' => [
                'user_id' => $request->user_id,
                'company_id' => $request->company_id,
                'status' => $request->status,
                'search' => $request->search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        // Convert "none" to null for optional company field
        $data = $request->all();
        if (isset($data['company_id']) && $data['company_id'] === 'none') {
            $data['company_id'] = null;
        }

        $validated = validator($data, [
            'task' => 'required|string',
            'user_id' => 'required|exists:users,id',
            'company_id' => 'nullable|exists:company,id',
        ])->validate();

        // Generate a new ID (you might want to use a better method for ID generation)
        $maxId = Todo::max('id') ?? 0;
        $validated['id'] = $maxId + 1;
        $validated['is_completed'] = false;
        $validated['created_at'] = now()->utc();

        Todo::create($validated);
        
        return redirect()->route('tasks.index')->with('success', 'Task created successfully');
    }

    public function update(Request $request, $id)
    {
        $todo = Todo::findOrFail($id);

        // Non-super-admin users can only update their own tasks
        $user = auth()->user();
        if (!$user->isSuperAdmin() && $todo->user_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only update your own tasks.');
        }

        // Convert "none" to null for optional company field
        $data = $request->all();
        if (isset($data['company_id']) && $data['company_id'] === 'none') {
            $data['company_id'] = null;
        }

        $validated = validator($data, [
            'task' => 'sometimes|required|string',
            'user_id' => 'sometimes|required|exists:users,id',
            'company_id' => 'nullable|exists:company,id',
            'is_completed' => 'sometimes|boolean',
        ])->validate();

        if (isset($validated['is_completed'])) {
            if ($validated['is_completed'] && !$todo->is_completed) {
                $validated['completed_at'] = now()->utc();
            } elseif (!$validated['is_completed'] && $todo->is_completed) {
                $validated['completed_at'] = null;
            }
        }

        $todo->update($validated);
        
        return redirect()->route('tasks.index')->with('success', 'Task updated successfully');
    }

    public function destroy($id)
    {
        $todo = Todo::findOrFail($id);

        // Non-super-admin users can only delete their own tasks
        $user = auth()->user();
        if (!$user->isSuperAdmin() && $todo->user_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only delete your own tasks.');
        }

        $todo->delete();
        
        return redirect()->route('tasks.index')->with('success', 'Task deleted successfully');
    }

    public function toggleComplete(Request $request, $id)
    {
        $todo = Todo::findOrFail($id);

        // Non-super-admin users can only toggle their own tasks
        $user = auth()->user();
        if (!$user->isSuperAdmin() && $todo->user_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only toggle your own tasks.');
        }
        
        $todo->is_completed = !$todo->is_completed;
        $todo->completed_at = $todo->is_completed ? now()->utc() : null;
        $todo->save();

        return back();
    }
}
