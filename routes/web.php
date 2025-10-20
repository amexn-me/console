<?php

use App\Http\Controllers\TaskController;
use App\Http\Controllers\CompaniesController;
use App\Http\Controllers\PartnersController;
use App\Http\Controllers\ContactsController;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\ActivityLogsController;
use App\Http\Controllers\LeadsController;
use App\Http\Controllers\CampaignsController;
use App\Http\Controllers\ProjectsController;
use App\Http\Controllers\ContractsController;
use App\Http\Controllers\UnipileController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CockpitController;
use App\Http\Controllers\Integrations\GoogleCalendarController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check() 
        ? redirect()->route('dashboard') 
        : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard - accessible to all authenticated users
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('tasks', TaskController::class);
    Route::post('tasks/{id}/toggle', [TaskController::class, 'toggleComplete'])->name('tasks.toggle');
    
    // Sales segment routes
    Route::prefix('sales')->group(function () {
        // Campaigns - Admin only
        Route::middleware(['admin'])->group(function () {
            Route::get('campaigns', [CampaignsController::class, 'index'])->name('campaigns.index');
            Route::get('campaigns/create', [CampaignsController::class, 'create'])->name('campaigns.create');
            Route::post('campaigns', [CampaignsController::class, 'store'])->name('campaigns.store');
            Route::get('campaigns/{campaign}', [CampaignsController::class, 'show'])->name('campaigns.show');
            Route::get('campaigns/{campaign}/edit', [CampaignsController::class, 'edit'])->name('campaigns.edit');
            Route::put('campaigns/{campaign}', [CampaignsController::class, 'update'])->name('campaigns.update');
            Route::delete('campaigns/{campaign}', [CampaignsController::class, 'destroy'])->name('campaigns.destroy');
            Route::post('campaigns/{campaign}/companies', [CampaignsController::class, 'addCompany'])->name('campaigns.companies.add');
            Route::post('campaigns/{campaign}/companies/bulk-add', [CampaignsController::class, 'bulkAddCompanies'])->name('campaigns.companies.bulk-add');
            Route::delete('campaigns/{campaign}/leads/{lead}', [CampaignsController::class, 'removeCompany'])->name('campaigns.companies.remove');
            Route::get('campaigns/{campaign}/bulk-changes', [CampaignsController::class, 'bulkChanges'])->name('campaigns.bulk-changes');
            Route::post('campaigns/{campaign}/bulk-update', [CampaignsController::class, 'bulkUpdate'])->name('campaigns.bulk-update');
            Route::get('campaigns/{campaign}/leads/export', [CampaignsController::class, 'exportLeads'])->name('campaigns.leads.export');
        });

        // Leads - Sales segment and admins
        Route::middleware(['segment:sales'])->group(function () {
            Route::get('leads', [LeadsController::class, 'index'])->name('leads.index');
            Route::get('leads/{lead}', [LeadsController::class, 'show'])->name('leads.show');
            Route::get('leads/{lead}/activities', [LeadsController::class, 'getLeadActivities'])->name('leads.activities');
            Route::get('leads/{lead}/proposals', [LeadsController::class, 'getLeadProposals'])->name('leads.proposals');
            Route::post('leads/{lead}/update', [LeadsController::class, 'update'])->name('leads.update');
            Route::post('leads/{lead}/change-stage', [LeadsController::class, 'changeStage'])->name('leads.change-stage');
            Route::post('leads/{lead}/proposal', [LeadsController::class, 'updateProposal'])->name('leads.proposal');
            Route::post('leads/{lead}/partner', [LeadsController::class, 'updatePartner'])->name('leads.partner');
            Route::post('leads/{lead}/agent', [LeadsController::class, 'updateAgent'])->name('leads.agent');
            Route::post('leads/{lead}/files', [LeadsController::class, 'uploadFiles'])->name('leads.files');
            Route::post('leads/{lead}/contacts', [LeadsController::class, 'addContact'])->name('leads.contacts.store');
            Route::put('leads/{lead}/contacts/{contact}', [LeadsController::class, 'updateContact'])->name('leads.contacts.update');
            Route::post('leads/{lead}/contacts/{contact}/pic', [LeadsController::class, 'updateContactPIC'])->name('leads.contacts.pic');
            Route::delete('leads/{lead}/contacts/{contact}/invalid', [LeadsController::class, 'invalidateContact'])->name('leads.contacts.invalid');
            Route::post('leads/{lead}/linkedin-search', [UnipileController::class, 'searchLinkedInLeadsFromLead'])->name('leads.linkedin-search');
        });

        // Meetings - accessible to all authenticated users
        Route::get('meetings', [CalendarController::class, 'meetings'])->name('meetings.index');

        // Companies - Sales segment and admins
        Route::middleware(['segment:sales'])->group(function () {
            Route::get('companies', [CompaniesController::class, 'index'])->name('companies.index');
            Route::get('companies/{company}', [CompaniesController::class, 'show'])->name('companies.show');
        });

        Route::middleware(['admin'])->group(function () {
            Route::post('companies', [CompaniesController::class, 'store'])->name('companies.store');
            Route::get('companies/export', [CompaniesController::class, 'export'])->name('companies.export');
        });

        // Contacts - Sales segment and admins
        Route::middleware(['segment:sales'])->group(function () {
            Route::get('contacts', [ContactsController::class, 'index'])->name('contacts.index');
        });

        // Partners - Admin only
        Route::middleware(['admin'])->group(function () {
            Route::get('partners', [PartnersController::class, 'index'])->name('partners.index');
            Route::post('partners', [PartnersController::class, 'store'])->name('partners.store');
            Route::put('partners/{id}', [PartnersController::class, 'update'])->name('partners.update');
            Route::delete('partners/{id}', [PartnersController::class, 'destroy'])->name('partners.destroy');
            Route::get('partners/companies/export', [PartnersController::class, 'exportCompanies'])->name('partners.companies.export');
        });

        // Activity logs - Admin only
        Route::middleware(['admin'])->group(function () {
            Route::get('activity-logs', [ActivityLogsController::class, 'index'])->name('activity-logs.index');
            Route::get('activity-logs/export', [ActivityLogsController::class, 'export'])->name('activity-logs.export');
        });
    });

    // Projects segment - accessible to project_user and project_admin only (+ super_admin)
    Route::prefix('projects')->middleware(['segment:project'])->group(function () {
        Route::get('/projects', [ProjectsController::class, 'index'])->name('projects.index');
        Route::get('/projects/{project}', [ProjectsController::class, 'show'])->name('projects.show');
    });

    // Finance/Contracts segment - accessible to finance_user and finance_admin only (+ super_admin)
    Route::prefix('finance')->middleware(['segment:finance'])->group(function () {
        Route::get('/contracts', [ContractsController::class, 'index'])->name('finance.index');
        Route::get('/contracts/{contract}', [ContractsController::class, 'show'])->name('finance.show');
    });

    // Cockpit - Super admin only
    Route::middleware(['super_admin'])->group(function () {
        Route::get('cockpit', [CockpitController::class, 'index'])->name('cockpit.index');
    });

    // Users - Super admin only
    Route::middleware(['super_admin'])->group(function () {
        Route::get('users', [UsersController::class, 'index'])->name('users.index');
        Route::post('users', [UsersController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UsersController::class, 'update'])->name('users.update');
        Route::post('users/{user}/toggle-status', [UsersController::class, 'toggleStatus'])->name('users.toggle-status');
        Route::post('users/{user}/reset-password', [UsersController::class, 'resetPassword'])->name('users.reset-password');
        Route::post('users/{user}/verify-email', [UsersController::class, 'verifyEmail'])->name('users.verify-email');
    });

    // Integrations - Super admin only
    Route::middleware(['super_admin'])->group(function () {
        Route::get('integrations/calendar', [GoogleCalendarController::class, 'index'])->name('integrations.calendar');
        Route::put('integrations/calendar/{account}/toggle-active', [GoogleCalendarController::class, 'toggleActive'])->name('integrations.calendar.toggle-active');
        Route::put('integrations/calendar/{account}/toggle-staff', [GoogleCalendarController::class, 'toggleStaffCalendar'])->name('integrations.calendar.toggle-staff');
        Route::delete('integrations/calendar/{account}', [GoogleCalendarController::class, 'destroy'])->name('integrations.calendar.delete');
    });

    // Google Calendar routes - accessible to all authenticated users
    Route::get('calendar/auth/google', [CalendarController::class, 'redirectToGoogle'])->name('calendar.auth.google');
    Route::get('auth/google/callback', [CalendarController::class, 'handleGoogleCallback'])->name('calendar.auth.callback');
    Route::get('calendar/events', [CalendarController::class, 'getEvents'])->name('calendar.events');
    Route::post('calendar/events', [CalendarController::class, 'createEvent'])->name('calendar.events.create');
    Route::put('calendar/events/{eventId}', [CalendarController::class, 'updateEvent'])->name('calendar.events.update');
    Route::delete('calendar/events/{eventId}', [CalendarController::class, 'deleteEvent'])->name('calendar.events.delete');
    Route::put('calendar/accounts/{account}/staff', [CalendarController::class, 'toggleStaffCalendar'])->name('calendar.accounts.staff');

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
