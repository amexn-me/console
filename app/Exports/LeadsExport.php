<?php

namespace App\Exports;

use App\Models\Lead;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class LeadsExport implements FromQuery, WithHeadings, WithMapping
{
    protected $filters;

    public function __construct($filters)
    {
        $this->filters = $filters;
    }

    public function query()
    {
        $user = auth()->user();
        
        $query = Lead::with(['campaign', 'company', 'agent', 'partner', 'activities' => function ($q) {
            $q->orderBy('created_at', 'desc')->limit(1);
        }]);

        // Filter by user's accessible campaigns
        if (!$user->isAdmin()) {
            $campaignIds = $user->campaigns()->pluck('campaigns.id');
            $query->whereIn('campaign_id', $campaignIds);
            // Also filter by agent if user is not admin
            $query->where('agent_id', $user->id);
        }

        // Apply filters
        if (!empty($this->filters['campaign_id'])) {
            $query->where('campaign_id', $this->filters['campaign_id']);
        }

        if (!empty($this->filters['stage'])) {
            $query->where('stage', $this->filters['stage']);
        }

        if (!empty($this->filters['agent_id'])) {
            $query->where('agent_id', $this->filters['agent_id']);
        }

        if (!empty($this->filters['search'])) {
            $query->whereHas('company', function ($q) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($this->filters['search']) . '%']);
            });
        }

        return $query->orderBy('created_at', 'desc');
    }

    public function headings(): array
    {
        return [
            'Lead ID',
            'Company Name',
            'Campaign',
            'Stage',
            'Agent',
            'Partner',
            'Next Follow-up',
            'Last Activity Date',
            'Created At',
            'First Qualified Date',
            'Closed Won Date',
            'Closed Lost Date',
        ];
    }

    public function map($lead): array
    {
        // Get last activity date
        $lastActivity = $lead->activities->first();
        $lastActivityDate = $lastActivity ? $lastActivity->created_at->format('Y-m-d H:i:s') : '';

        return [
            $lead->id,
            $lead->company ? $lead->company->name : '',
            $lead->campaign ? $lead->campaign->name : '',
            $lead->stage,
            $lead->agent ? $lead->agent->name : '',
            $lead->partner ? $lead->partner->name : '',
            $lead->next_followup_date ? $lead->next_followup_date->format('Y-m-d') : '',
            $lastActivityDate,
            $lead->created_at ? $lead->created_at->format('Y-m-d H:i:s') : '',
            $lead->first_qualified_stage_date ? $lead->first_qualified_stage_date->format('Y-m-d') : '',
            $lead->closed_won_date ? $lead->closed_won_date->format('Y-m-d H:i:s') : '',
            $lead->closed_lost_date ? $lead->closed_lost_date->format('Y-m-d H:i:s') : '',
        ];
    }
}

