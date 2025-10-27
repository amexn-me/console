<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    protected $table = 'contact';
    
    public $incrementing = false;
    
    public $timestamps = false;
    
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;
    
    protected $fillable = [
        'id',
        'company_id',
        'name',
        'title',
        'email',
        'phone1',
        'phone2',
        'linkedin_url',
        'is_pic',
        'next_followup_date',
        'do_not_contact',
        'is_invalid',
        'interest_level',
        'next_followup_datetime',
        'followup_completed',
        'reminder_sent',
    ];

    protected $casts = [
        'is_pic' => 'boolean',
        'do_not_contact' => 'boolean',
        'is_invalid' => 'boolean',
        'followup_completed' => 'boolean',
        'reminder_sent' => 'boolean',
        'next_followup_date' => 'date',
        'next_followup_datetime' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function activities()
    {
        return $this->hasMany(Activity::class, 'contact_id');
    }

    // Get the agent assigned to this contact through the lead
    public function getAgentAttribute()
    {
        // Find the lead associated with this contact's company
        $lead = Lead::where('company_id', $this->company_id)->first();
        return $lead ? $lead->agent : null;
    }

    // Scope to filter contacts by agent
    public function scopeForAgent($query, $agentId)
    {
        return $query->whereHas('company', function($q) use ($agentId) {
            $q->whereHas('leads', function($leadQuery) use ($agentId) {
                $leadQuery->where('agent_id', $agentId);
            });
        });
    }
}

