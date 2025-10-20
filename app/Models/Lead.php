<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    protected $fillable = [
        'campaign_id',
        'company_id',
        'stage',
        'agent_id',
        'next_followup_date',
        'first_qualified_stage_date',
        'pic_not_identified_date',
        'pic_identified_date',
        'contacted_date',
        'disqualified_date',
        'demo_requested_date',
        'demo_completed_date',
        'proposal_date',
        'closed_won_date',
        'closed_lost_date',
        'questionnaire_sent_date',
        'questionnaire_replied_date',
        'partner_id',
        'lockin_date',
        'proposal_currency',
        'proposal_one_time_fees',
        'proposal_annual_subscription',
        'proposal_other_info',
    ];

    protected $casts = [
        'next_followup_date' => 'date',
        'first_qualified_stage_date' => 'date',
        'lockin_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'pic_not_identified_date' => 'datetime',
        'pic_identified_date' => 'datetime',
        'contacted_date' => 'datetime',
        'disqualified_date' => 'datetime',
        'demo_requested_date' => 'datetime',
        'demo_completed_date' => 'datetime',
        'proposal_date' => 'datetime',
        'closed_won_date' => 'datetime',
        'closed_lost_date' => 'datetime',
        'questionnaire_sent_date' => 'datetime',
        'questionnaire_replied_date' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function partner()
    {
        return $this->belongsTo(Partner::class, 'partner_id');
    }

    public function activities()
    {
        return $this->hasMany(Activity::class, 'lead_id');
    }

    public function files()
    {
        return $this->hasMany(CompanyFile::class, 'lead_id');
    }
}
