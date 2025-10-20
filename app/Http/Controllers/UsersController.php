<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class UsersController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()->with('disabledByUser:id,name,email');

        // Sort alphabetically by name
        $query->orderBy('name', 'asc');

        $users = $query->paginate(20);

        // Get statistics
        $stats = [
            'total' => User::count(),
            'active' => User::active()->count(),
            'inactive' => User::inactive()->count(),
            'super_admins' => User::byRole(User::ROLE_SUPER_ADMIN)->count(),
            'admins' => User::whereIn('role', User::ADMIN_ROLES)->count(),
            'users' => User::whereIn('role', User::USER_ROLES)->count(),
        ];

        return Inertia::render('Users/Index', [
            'users' => $users,
            'stats' => $stats,
            'availableRoles' => User::ALL_ROLES,
            'roleLabels' => $this->getRoleLabels(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', Rule::in(User::ALL_ROLES)],
            'is_active' => ['boolean'],
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['email_verified_at'] = now()->utc();

        $user = User::create($validated);

        return redirect('/users')->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'role' => ['required', Rule::in(User::ALL_ROLES)],
            'password' => ['nullable', Password::defaults()],
        ]);

        // Prevent user from changing their own role
        if ($user->id === auth()->id() && $user->role !== $validated['role']) {
            return back()->withErrors(['role' => 'You cannot change your own role.']);
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return redirect('/users')->with('success', 'User updated successfully.');
    }

    public function toggleStatus(Request $request, User $user)
    {
        // Prevent user from disabling themselves
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'You cannot disable your own account.']);
        }

        // Prevent disabling super admins
        if ($user->isSuperAdmin()) {
            return back()->withErrors(['error' => 'Super admins cannot be disabled.']);
        }

        if ($user->isActive()) {
            $validated = $request->validate([
                'reason' => ['nullable', 'string', 'max:500'],
            ]);

            $user->disable($validated['reason'] ?? null, auth()->user());

            return redirect('/users')->with('success', 'User disabled successfully.');
        } else {
            $user->enable();

            return redirect('/users')->with('success', 'User enabled successfully.');
        }
    }

    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return redirect('/users')->with('success', 'Password reset successfully.');
    }

    public function verifyEmail(User $user)
    {
        if ($user->hasVerifiedEmail()) {
            return redirect('/users')->with('info', 'Email already verified.');
        }

        $user->markEmailAsVerified();

        return redirect('/users')->with('success', 'Email verified successfully.');
    }

    protected function getRoleLabels(): array
    {
        return [
            User::ROLE_SUPER_ADMIN => 'Super Admin',
            User::ROLE_SALES_ADMIN => 'Sales Admin',
            User::ROLE_DEV_ADMIN => 'Development Admin',
            User::ROLE_PROJECT_ADMIN => 'Project Admin',
            User::ROLE_SALES_USER => 'Sales User',
            User::ROLE_DEV_USER => 'Development User',
            User::ROLE_PROJECT_USER => 'Project User',
        ];
    }
}

