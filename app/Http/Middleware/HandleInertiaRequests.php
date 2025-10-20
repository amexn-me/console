<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user() ? [
                    ...$request->user()->toArray(),
                    'permissions' => $this->getUserPermissions($request),
                ] : null,
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Get user permissions based on their role
     */
    protected function getUserPermissions(Request $request): array
    {
        if (!$request->user()) {
            return [];
        }

        $user = $request->user();

        return [
            'isSuperAdmin' => $user->isSuperAdmin(),
            'isAdmin' => $user->isAdmin(),
            'isSegmentAdmin' => $user->isSegmentAdmin(),
            'isUser' => $user->isUser(),
            'segment' => $user->getSegment(),
            'isSalesSegment' => $user->isSalesSegment(),
            'isDevSegment' => $user->isDevSegment(),
            'isProjectSegment' => $user->isProjectSegment(),
            'can' => [
                'manageUsers' => $user->can('manage-users'),
                'managePartners' => $user->can('manage-partners'),
                'manageCompanies' => $user->can('manage-companies'),
                'manageContacts' => $user->can('manage-contacts'),
                'manageLeads' => $user->can('manage-leads'),
                'viewActivityLogs' => $user->can('view-activity-logs'),
                'exportData' => $user->can('export-data'),
                'manageProjects' => $user->can('manage-projects'),
                'viewProjects' => $user->can('view-projects'),
                'manageDevelopment' => $user->can('manage-development'),
                'viewDevelopment' => $user->can('view-development'),
                'manageCalendar' => $user->can('manage-calendar'),
                'viewCalendar' => $user->can('view-calendar'),
            ],
        ];
    }
}
