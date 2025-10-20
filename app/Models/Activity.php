<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{
    protected $table = 'activity';
    
    public $incrementing = false;
    
    public $timestamps = false;
    
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'agent_id',
        'company_id',
        'lead_id',
        'contact_id',
        'activity_type',
        'conversation_method',
        'conversation_connected',
        'next_followup_date',
        'remarks',
        'notes',
        'next_followup_datetime',
        'created_at',
    ];

    protected $casts = [
        'next_followup_date' => 'date',
        'next_followup_datetime' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }
}

