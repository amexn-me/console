<?php

namespace App\Exports;

use App\Models\Lead;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class CampaignLeadsExport implements FromQuery, WithHeadings, WithMapping
{
    protected $campaignId;

    public function __construct($campaignId)
    {
        $this->campaignId = $campaignId;
    }

    public function query()
    {
        return Lead::query()
            ->where('campaign_id', $this->campaignId)
            ->with(['company', 'agent', 'partner'])
            ->orderBy('created_at', 'desc');
    }

    public function headings(): array
    {
        return [
            'Lead ID',
            'Company Name',
            'Stage',
            'Agent',
            'Partner',
            'Next Follow-up',
            'Added On',
            'First Qualified Date',
            'Closed Won Date',
            'Closed Lost Date',
        ];
    }

    public function map($lead): array
    {
        return [
            $lead->id,
            $lead->company ? $lead->company->name : '',
            $lead->stage,
            $lead->agent ? $lead->agent->name : '',
            $lead->partner ? $lead->partner->name : '',
            $lead->next_followup_date ? $lead->next_followup_date->format('Y-m-d') : '',
            $lead->created_at ? $lead->created_at->format('Y-m-d H:i:s') : '',
            $lead->first_qualified_stage_date ? $lead->first_qualified_stage_date->format('Y-m-d') : '',
            $lead->closed_won_date ? $lead->closed_won_date->format('Y-m-d H:i:s') : '',
            $lead->closed_lost_date ? $lead->closed_lost_date->format('Y-m-d H:i:s') : '',
        ];
    }
}

