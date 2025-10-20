<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyFile extends Model
{
    protected $fillable = [
        'company_id',
        'lead_id',
        'project_id',
        'contract_id',
        'file_category',
        'filename',
        'original_filename',
        'file_path',
        'file_size',
        'uploaded_at',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function contract()
    {
        return $this->belongsTo(Contract::class, 'contract_id');
    }
}

