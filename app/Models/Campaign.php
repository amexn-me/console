<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    protected $fillable = [
        'name',
        'product_id',
        'description',
        'status',
        'created_by',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'campaign_users', 'campaign_id', 'user_id')
            ->withTimestamps();
    }

    public function leads()
    {
        return $this->hasMany(Lead::class, 'campaign_id');
    }

    public function companies()
    {
        return $this->belongsToMany(Company::class, 'leads', 'campaign_id', 'company_id')
            ->withPivot(['id', 'stage', 'agent_id', 'next_followup_date'])
            ->withTimestamps();
    }
}
