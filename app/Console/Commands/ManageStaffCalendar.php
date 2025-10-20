<?php

namespace App\Console\Commands;

use App\Models\GoogleCalendarAccount;
use Illuminate\Console\Command;

class ManageStaffCalendar extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'calendar:staff 
                            {action : The action to perform (list, enable, disable)} 
                            {email? : The email address of the calendar account}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage staff calendar accounts';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $action = $this->argument('action');
        $email = $this->argument('email');

        switch ($action) {
            case 'list':
                $this->listAccounts();
                break;
            case 'enable':
                if (!$email) {
                    $this->error('Email is required for enable action');
                    return 1;
                }
                $this->enableStaffCalendar($email);
                break;
            case 'disable':
                if (!$email) {
                    $this->error('Email is required for disable action');
                    return 1;
                }
                $this->disableStaffCalendar($email);
                break;
            default:
                $this->error('Invalid action. Use: list, enable, or disable');
                return 1;
        }

        return 0;
    }

    private function listAccounts()
    {
        $accounts = GoogleCalendarAccount::with('user')->get();

        if ($accounts->isEmpty()) {
            $this->info('No calendar accounts found.');
            return;
        }

        $this->info('Calendar Accounts:');
        $this->newLine();

        $tableData = $accounts->map(function ($account) {
            return [
                'ID' => $account->id,
                'Name' => $account->name,
                'Email' => $account->email,
                'Staff Calendar' => $account->is_staff_calendar ? '✓' : '✗',
                'Active' => $account->is_active ? '✓' : '✗',
                'User' => $account->user->name ?? 'N/A',
            ];
        })->toArray();

        $this->table(
            ['ID', 'Name', 'Email', 'Staff Calendar', 'Active', 'User'],
            $tableData
        );

        $this->newLine();
        $this->info('Total: ' . $accounts->count() . ' accounts');
        $this->info('Staff Calendars: ' . $accounts->where('is_staff_calendar', true)->count());
    }

    private function enableStaffCalendar($email)
    {
        $account = GoogleCalendarAccount::where('email', $email)->first();

        if (!$account) {
            $this->error("Account not found: {$email}");
            $this->info('Use "php artisan calendar:staff list" to see all accounts');
            return;
        }

        if ($account->is_staff_calendar) {
            $this->info("{$email} is already enabled as a staff calendar");
            return;
        }

        $account->update(['is_staff_calendar' => true]);
        $this->info("✓ Enabled staff calendar for: {$account->name} ({$email})");
    }

    private function disableStaffCalendar($email)
    {
        $account = GoogleCalendarAccount::where('email', $email)->first();

        if (!$account) {
            $this->error("Account not found: {$email}");
            $this->info('Use "php artisan calendar:staff list" to see all accounts');
            return;
        }

        if (!$account->is_staff_calendar) {
            $this->info("{$email} is already disabled as a staff calendar");
            return;
        }

        $account->update(['is_staff_calendar' => false]);
        $this->info("✓ Disabled staff calendar for: {$account->name} ({$email})");
    }
}
