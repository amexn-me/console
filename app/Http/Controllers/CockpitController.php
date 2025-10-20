<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Lead;
use App\Models\Project;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CockpitController extends Controller
{
    /**
     * Show the cockpit dashboard
     */
    public function index()
    {
        // Get conversion rates
        $sarToAed = Setting::get('currency_rate_sar_to_aed', 1.00);
        $myrToAed = Setting::get('currency_rate_myr_to_aed', 0.82);

        // Calculate ARR (Annual Recurring Revenue) from active contracts
        $contracts = Contract::whereIn('status', ['active', 'draft'])
            ->get(['currency', 'annual_subscription']);

        $totalArr = 0;
        foreach ($contracts as $contract) {
            if ($contract->annual_subscription) {
                $amount = (float) $contract->annual_subscription;
                
                // Convert to AED based on currency
                $amountInAed = match (strtoupper($contract->currency)) {
                    'SAR' => $amount * $sarToAed,
                    'MYR' => $amount * $myrToAed,
                    default => $amount, // AED or default
                };
                
                $totalArr += $amountInAed;
            }
        }

        // Calculate Open Interest from proposals (leads in proposal/negotiation stages)
        $openProposalStages = ['Proposal'];
        $leads = Lead::whereIn('stage', $openProposalStages)
            ->get(['proposal_currency', 'proposal_annual_subscription']);

        $totalOpenInterest = 0;
        foreach ($leads as $lead) {
            if ($lead->proposal_annual_subscription) {
                $amount = (float) $lead->proposal_annual_subscription;
                
                // Convert to AED based on currency
                $amountInAed = match (strtoupper($lead->proposal_currency ?? 'AED')) {
                    'SAR' => $amount * $sarToAed,
                    'MYR' => $amount * $myrToAed,
                    default => $amount, // AED or default
                };
                
                $totalOpenInterest += $amountInAed;
            }
        }

        // Count open projects (not completed)
        $openProjectsCount = Project::where('status', '!=', 'completed')
            ->orWhereNull('status')
            ->count();

        return Inertia::render('Cockpit/Index', [
            'arr' => round($totalArr, 2),
            'openInterest' => round($totalOpenInterest, 2),
            'openProjectsCount' => $openProjectsCount,
            'conversionRates' => [
                'sar_to_aed' => $sarToAed,
                'myr_to_aed' => $myrToAed,
            ],
        ]);
    }
}
