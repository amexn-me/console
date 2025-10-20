<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtpLog extends Model
{
    protected $table = 'otp_log';
    
    protected $primaryKey = 'id';
    public $incrementing = true;

    // Only use created_at, not updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'otp',
        'ip_address',
        'user_agent',
        'location',
        'is_used',
        'is_expired',
        'attempts_used',
        'max_attempts',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'is_used' => 'boolean',
        'is_expired' => 'boolean',
        'attempts_used' => 'integer',
        'max_attempts' => 'integer',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'created_at' => 'datetime',
    ];
    
    protected $attributes = [
        'is_used' => false,
        'is_expired' => false,
        'attempts_used' => 0,
        'max_attempts' => 3,
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if OTP is valid and not expired
     */
    public function isValid(): bool
    {
        // Refresh from database to get latest values
        $this->refresh();
        
        return ($this->is_used !== true)
            && ($this->is_expired !== true)
            && $this->expires_at->isFuture()
            && ($this->attempts_used < $this->max_attempts);
    }

    /**
     * Mark OTP as expired
     */
    public function markAsExpired(): void
    {
        $this->is_expired = true;
        $this->save();
    }

    /**
     * Increment attempt count
     */
    public function incrementAttempts(): void
    {
        $this->attempts_used = $this->attempts_used + 1;
        
        if ($this->attempts_used >= $this->max_attempts) {
            $this->is_expired = true;
        }
        
        $this->save();
    }

    /**
     * Mark OTP as used
     */
    public function markAsUsed(): void
    {
        $this->is_used = true;
        $this->used_at = now();
        $this->save();
    }
    
    /**
     * Get basic location from IP address
     */
    public static function getLocationFromIp(?string $ip): ?string
    {
        if (!$ip || $ip === '127.0.0.1' || $ip === '::1') {
            return 'Local';
        }
        
        try {
            // Using ip-api.com free API (no key required, limited to 45 requests per minute)
            $response = @file_get_contents("http://ip-api.com/json/{$ip}?fields=status,country,regionName,city");
            
            if ($response) {
                $data = json_decode($response, true);
                
                if ($data && $data['status'] === 'success') {
                    $parts = array_filter([
                        $data['city'] ?? null,
                        $data['regionName'] ?? null,
                        $data['country'] ?? null,
                    ]);
                    
                    return implode(', ', $parts) ?: null;
                }
            }
        } catch (\Exception $e) {
            // Silently fail and return null
        }
        
        return null;
    }
}

