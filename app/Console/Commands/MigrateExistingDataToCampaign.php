<?php

namespace App\Console\Commands;

use App\Models\Campaign;
use App\Models\Company;
use App\Models\Lead;
use App\Models\Activity;
use App\Models\CompanyFile;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateExistingDataToCampaign extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:campaigns 
                            {--dry-run : Run the migration without making changes}
                            {--campaign-name=L1 - FTA eInvoicing : Name of the campaign to create}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing company data to the new campaign structure';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        $campaignName = $this->option('campaign-name');

        $this->info('=====================================');
        $this->info('Campaign Data Migration Script');
        $this->info('=====================================');
        $this->newLine();

        if ($isDryRun) {
            $this->warn('🔍 DRY RUN MODE - No changes will be made');
            $this->newLine();
        }

        // Step 1: Get statistics
        $this->info('Step 1: Gathering statistics...');
        $companyCount = Company::count();
        $activityCount = Activity::whereNotNull('company_id')->count();
        $fileCount = CompanyFile::count();

        $this->table(
            ['Item', 'Count'],
            [
                ['Companies', $companyCount],
                ['Activities', $activityCount],
                ['Files', $fileCount],
            ]
        );

        if ($companyCount === 0) {
            $this->warn('No companies found to migrate. Exiting.');
            return Command::SUCCESS;
        }

        if (!$this->confirm('Do you want to proceed with the migration?', true)) {
            $this->warn('Migration cancelled by user.');
            return Command::SUCCESS;
        }

        $this->newLine();

        // Step 2: Create or get the campaign
        $this->info("Step 2: Creating campaign '{$campaignName}'...");
        
        if (!$isDryRun) {
            DB::beginTransaction();
            try {
                // Get the first admin user as the creator
                $adminUser = User::whereIn('role', User::ADMIN_ROLES)->first();
                
                if (!$adminUser) {
                    $this->error('No admin user found. Please create an admin user first.');
                    return Command::FAILURE;
                }

                // Check if campaign already exists
                $campaign = Campaign::where('name', $campaignName)->first();
                
                if ($campaign) {
                    $this->warn("Campaign '{$campaignName}' already exists (ID: {$campaign->id})");
                    if (!$this->confirm('Do you want to use this existing campaign?', true)) {
                        DB::rollBack();
                        $this->warn('Migration cancelled.');
                        return Command::SUCCESS;
                    }
                } else {
                    $campaign = Campaign::create([
                        'name' => $campaignName,
                        'description' => 'Default campaign created during data migration',
                        'status' => 'active',
                        'created_by' => $adminUser->id,
                        'start_date' => now(),
                    ]);
                    $this->info("✓ Campaign created (ID: {$campaign->id})");
                }

                // Attach all active sales users to the campaign
                $salesUsers = User::whereIn('role', User::SALES_ROLES)
                    ->where('is_active', true)
                    ->pluck('id');
                
                if ($salesUsers->isNotEmpty()) {
                    $campaign->users()->sync($salesUsers);
                    $this->info("✓ Attached {$salesUsers->count()} sales users to the campaign");
                }

                $this->newLine();

                // Step 3: Migrate companies to leads
                $this->info('Step 3: Migrating companies to leads...');
                $bar = $this->output->createProgressBar($companyCount);
                $bar->start();

                $migratedCount = 0;
                $skippedCount = 0;

                Company::chunk(100, function ($companies) use ($campaign, &$migratedCount, &$skippedCount, $bar) {
                    foreach ($companies as $company) {
                        // Check if lead already exists
                        $existingLead = Lead::where('campaign_id', $campaign->id)
                            ->where('company_id', $company->id)
                            ->first();

                        if ($existingLead) {
                            $skippedCount++;
                            $bar->advance();
                            continue;
                        }

                        // Create lead from company data
                        $lead = Lead::create([
                            'campaign_id' => $campaign->id,
                            'company_id' => $company->id,
                            'stage' => $company->stage,
                            'agent_id' => $company->agent_id,
                            'next_followup_date' => $company->next_followup_date,
                            'first_qualified_stage_date' => $company->first_qualified_stage_date,
                            'pic_not_identified_date' => $company->pic_not_identified_date,
                            'pic_identified_date' => $company->pic_identified_date,
                            'contacted_date' => $company->contacted_date,
                            'disqualified_date' => $company->disqualified_date,
                            'demo_requested_date' => $company->demo_requested_date,
                            'demo_completed_date' => $company->demo_completed_date,
                            'proposal_date' => $company->proposal_date,
                            'closed_won_date' => $company->closed_won_date,
                            'closed_lost_date' => $company->closed_lost_date,
                            'questionnaire_sent_date' => $company->questionnaire_sent_date,
                            'questionnaire_replied_date' => $company->questionnaire_replied_date,
                            'partner_id' => $company->partner_id,
                            'lockin_date' => $company->lockin_date,
                            'proposal_currency' => $company->proposal_currency,
                            'proposal_one_time_fees' => $company->proposal_one_time_fees,
                            'proposal_annual_subscription' => $company->proposal_annual_subscription,
                            'proposal_other_info' => $company->proposal_other_info,
                        ]);

                        // Update activities to reference the lead
                        Activity::where('company_id', $company->id)
                            ->whereNull('lead_id')
                            ->update(['lead_id' => $lead->id]);

                        // Update files to reference the lead
                        CompanyFile::where('company_id', $company->id)
                            ->whereNull('lead_id')
                            ->update(['lead_id' => $lead->id]);

                        $migratedCount++;
                        $bar->advance();
                    }
                });

                $bar->finish();
                $this->newLine(2);

                $this->info("✓ Migrated {$migratedCount} companies to leads");
                if ($skippedCount > 0) {
                    $this->warn("⚠ Skipped {$skippedCount} companies (already migrated)");
                }

                DB::commit();

                $this->newLine();
                $this->info('=====================================');
                $this->info('✓ Migration completed successfully!');
                $this->info('=====================================');
                $this->newLine();
                $this->info('Summary:');
                $this->table(
                    ['Item', 'Value'],
                    [
                        ['Campaign Name', $campaign->name],
                        ['Campaign ID', $campaign->id],
                        ['Companies Migrated', $migratedCount],
                        ['Companies Skipped', $skippedCount],
                        ['Users Assigned', $salesUsers->count()],
                    ]
                );

                $this->newLine();
                $this->warn('⚠️  IMPORTANT NOTES:');
                $this->line('1. The old company data columns have NOT been deleted to preserve data.');
                $this->line('2. The new APIs will only work with the Lead structure.');
                $this->line('3. You can safely remove old campaign-related columns from the company table after verifying the migration.');
                $this->line('4. Run the following command to create a migration to drop old columns:');
                $this->line('   php artisan make:migration drop_old_campaign_columns_from_company_table');

            } catch (\Exception $e) {
                DB::rollBack();
                $this->error('Migration failed: ' . $e->getMessage());
                $this->error('Stack trace: ' . $e->getTraceAsString());
                return Command::FAILURE;
            }
        } else {
            $this->info('DRY RUN: Would create campaign and migrate ' . $companyCount . ' companies');
        }

        return Command::SUCCESS;
    }
}

