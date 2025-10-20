<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $table = 'company';
    
    public $incrementing = false;
    
    protected $fillable = [
        'id',
        'name',
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
        'li_company_code',
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

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function partner()
    {
        return $this->belongsTo(Partner::class, 'partner_id');
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class, 'company_id');
    }

    public function activities()
    {
        return $this->hasMany(Activity::class, 'company_id');
    }

    public function proposals()
    {
        return $this->hasMany(CompanyProposal::class, 'company_id');
    }

    public function todos()
    {
        return $this->hasMany(Todo::class, 'company_id');
    }

    public function files()
    {
        return $this->hasMany(CompanyFile::class, 'company_id');
    }

    public function leads()
    {
        return $this->hasMany(Lead::class, 'company_id');
    }

    public function campaigns()
    {
        return $this->belongsToMany(Campaign::class, 'leads', 'company_id', 'campaign_id')
            ->withPivot(['id', 'stage', 'agent_id', 'next_followup_date'])
            ->withTimestamps();
    }
}

