<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    protected $fillable = [
        'lead_id',
        'company_id',
        'campaign_id',
        'product_id',
        'project_id',
        'contract_number',
        'status',
        'agent_id',
        'partner_id',
        'currency',
        'one_time_fees',
        'annual_subscription',
        'other_info',
        'go_live_date',
        'contract_start_date',
        'contract_end_date',
        'signed_date',
        'payment_milestones',
        'notes',
    ];

    protected $casts = [
        'go_live_date' => 'date',
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'signed_date' => 'date',
        'payment_milestones' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

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
        return $this->belongsToMany(Contact::class, 'contract_contacts', 'contract_id', 'contact_id')
            ->withTimestamps();
    }

    public function files()
    {
        return $this->hasMany(CompanyFile::class, 'contract_id');
    }
}

