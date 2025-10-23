<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Define authorization gates
        $this->defineGates();
    }

    /**
     * Define authorization gates for role-based permissions
     */
    protected function defineGates(): void
    {
        // Super admin can do everything
        Gate::before(function (User $user, $ability) {
            if ($user->isSuperAdmin()) {
                return true;
            }
        });

        // Admin gates
        Gate::define('admin-access', fn (User $user) => $user->isAdmin());
        Gate::define('super-admin-access', fn (User $user) => $user->isSuperAdmin());
        Gate::define('segment-admin-access', fn (User $user) => $user->isSegmentAdmin());

        // Segment gates
        Gate::define('sales-segment', fn (User $user) => $user->isSalesSegment());
        Gate::define('dev-segment', fn (User $user) => $user->isDevSegment());
        Gate::define('project-segment', fn (User $user) => $user->isProjectSegment());

        // Resource management gates
        Gate::define('manage-users', fn (User $user) => $user->isSuperAdmin());
        Gate::define('manage-partners', fn (User $user) => $user->isAdmin());
        Gate::define('manage-companies', fn (User $user) => $user->isAdmin() || $user->isSalesSegment());
        Gate::define('manage-contacts', fn (User $user) => $user->isAdmin() || $user->isSalesSegment());
        Gate::define('manage-leads', fn (User $user) => $user->isAdmin() || $user->isSalesSegment());
        Gate::define('view-activity-logs', fn (User $user) => $user->isAdmin() || $user->hasRole(User::ROLE_SALES_USER));
        Gate::define('export-data', fn (User $user) => $user->isAdmin());

        // Project management gates
        Gate::define('manage-projects', fn (User $user) => $user->isAdmin() || $user->isProjectSegment());
        Gate::define('view-projects', fn (User $user) => $user->isAdmin() || $user->isProjectSegment());

        // Development gates
        Gate::define('manage-development', fn (User $user) => $user->isAdmin() || $user->isDevSegment());
        Gate::define('view-development', fn (User $user) => $user->isAdmin() || $user->isDevSegment());

        // Calendar gates
        Gate::define('manage-calendar', fn (User $user) => true); // All authenticated users
        Gate::define('view-calendar', fn (User $user) => true); // All authenticated users
    }
}
