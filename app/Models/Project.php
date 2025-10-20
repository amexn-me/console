<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'lead_id',
        'company_id',
        'campaign_id',
        'product_id',
        'name',
        'description',
        'status',
        'agent_id',
        'partner_id',
        'start_date',
        'expected_completion_date',
        'actual_completion_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'expected_completion_date' => 'date',
        'actual_completion_date' => 'date',
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
        return $this->belongsToMany(Contact::class, 'project_contacts', 'project_id', 'contact_id')
            ->withTimestamps();
    }

    public function files()
    {
        return $this->hasMany(CompanyFile::class, 'project_id');
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class, 'project_id');
    }
}

