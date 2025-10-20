<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Partner extends Model
{
    protected $table = 'partner';
    
    public $incrementing = false;
    
    protected $fillable = [
        'id',
        'name',
        'email',
        'partnership_model',
        'notes',
        'contract_status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function companies()
    {
        return $this->hasMany(Company::class, 'partner_id');
    }
}

