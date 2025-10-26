<?php

namespace App\Exports;

use App\Models\Lead;
use Illuminate\Support\Facades\DB;
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

        // Apply filters (supports single value or array)
        if (!empty($this->filters['campaign_id'])) {
            $campaignIds = is_array($this->filters['campaign_id']) ? $this->filters['campaign_id'] : [$this->filters['campaign_id']];
            $query->whereIn('campaign_id', $campaignIds);
        }

        if (!empty($this->filters['stage'])) {
            $stages = is_array($this->filters['stage']) ? $this->filters['stage'] : [$this->filters['stage']];
            $query->whereIn('stage', $stages);
        }

        if (!empty($this->filters['agent_id'])) {
            $agentIds = is_array($this->filters['agent_id']) ? $this->filters['agent_id'] : [$this->filters['agent_id']];
            $query->whereIn('agent_id', $agentIds);
        }

        if (!empty($this->filters['search'])) {
            $query->whereHas('company', function ($q) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($this->filters['search']) . '%']);
            });
        }

        // Apply sorting
        $sortBy = $this->filters['sort_by'] ?? 'id';
        $sortDirection = $this->filters['sort_direction'] ?? 'desc';

        // Map frontend sort column names to database columns/relationships
        switch ($sortBy) {
            case 'company_name':
                $query->join('company', 'leads.company_id', '=', 'company.id')
                    ->orderBy('company.name', $sortDirection)
                    ->select('leads.*');
                break;
            case 'campaign_name':
                $query->join('campaigns', 'leads.campaign_id', '=', 'campaigns.id')
                    ->orderBy('campaigns.name', $sortDirection)
                    ->select('leads.*');
                break;
            case 'agent_name':
                $query->join('users', 'leads.agent_id', '=', 'users.id')
                    ->orderBy('users.name', $sortDirection)
                    ->select('leads.*');
                break;
            case 'partner_name':
                $query->leftJoin('partner', 'leads.partner_id', '=', 'partner.id')
                    ->orderBy('partner.name', $sortDirection)
                    ->select('leads.*');
                break;
            case 'stage':
            case 'id':
                $query->orderBy($sortBy, $sortDirection);
                break;
            case 'next_followup_date':
                $query->leftJoin(
                    DB::raw('(SELECT company_id, MIN(next_followup_datetime) as earliest_followup FROM contact WHERE next_followup_datetime IS NOT NULL AND do_not_contact = false GROUP BY company_id) as contact_followups'),
                    'leads.company_id',
                    '=',
                    'contact_followups.company_id'
                )
                ->orderBy('contact_followups.earliest_followup', $sortDirection)
                ->select('leads.*');
                break;
            case 'last_activity_date':
                $query->leftJoin(
                    DB::raw('(SELECT lead_id, MAX(created_at) as last_activity_at FROM activity WHERE lead_id IS NOT NULL GROUP BY lead_id) as last_activities'),
                    'leads.id',
                    '=',
                    'last_activities.lead_id'
                )
                ->orderBy('last_activities.last_activity_at', $sortDirection)
                ->select('leads.*');
                break;
            case 'contacts_count':
                $query->leftJoin('company as c', 'leads.company_id', '=', 'c.id')
                    ->leftJoin(
                        DB::raw('(SELECT company_id, COUNT(*) as contacts_count FROM contact GROUP BY company_id) as contact_counts'),
                        'leads.company_id',
                        '=',
                        'contact_counts.company_id'
                    )
                    ->orderBy('contact_counts.contacts_count', $sortDirection)
                    ->select('leads.*');
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        return $query;
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

