<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyProposal extends Model
{
    protected $table = 'company_proposal';
    
    public $incrementing = false;

    protected $fillable = [
        'id',
        'company_id',
        'campaign_id',
        'currency',
        'one_time_fees',
        'subscription',
        'annual_subscription',
        'subscription_frequency',
        'other_info',
        'created_by',
    ];

    protected $casts = [
        'one_time_fees' => 'decimal:2',
        'subscription' => 'decimal:2',
        'annual_subscription' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

