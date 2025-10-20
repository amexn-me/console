<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    // Role constants
    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_SALES_ADMIN = 'sales_admin';
    public const ROLE_DEV_ADMIN = 'dev_admin';
    public const ROLE_PROJECT_ADMIN = 'project_admin';
    public const ROLE_FINANCE_ADMIN = 'finance_admin';
    public const ROLE_SALES_USER = 'sales_user';
    public const ROLE_DEV_USER = 'dev_user';
    public const ROLE_PROJECT_USER = 'project_user';
    public const ROLE_FINANCE_USER = 'finance_user';

    // Role groups
    public const ADMIN_ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_SALES_ADMIN,
        self::ROLE_DEV_ADMIN,
        self::ROLE_PROJECT_ADMIN,
        self::ROLE_FINANCE_ADMIN,
    ];

    public const USER_ROLES = [
        self::ROLE_SALES_USER,
        self::ROLE_DEV_USER,
        self::ROLE_PROJECT_USER,
        self::ROLE_FINANCE_USER,
    ];

    public const ALL_ROLES = [
        self::ROLE_SUPER_ADMIN,
        self::ROLE_SALES_ADMIN,
        self::ROLE_DEV_ADMIN,
        self::ROLE_PROJECT_ADMIN,
        self::ROLE_FINANCE_ADMIN,
        self::ROLE_SALES_USER,
        self::ROLE_DEV_USER,
        self::ROLE_PROJECT_USER,
        self::ROLE_FINANCE_USER,
    ];

    // Segment mappings
    public const SALES_ROLES = [self::ROLE_SALES_ADMIN, self::ROLE_SALES_USER];
    public const DEV_ROLES = [self::ROLE_DEV_ADMIN, self::ROLE_DEV_USER];
    public const PROJECT_ROLES = [self::ROLE_PROJECT_ADMIN, self::ROLE_PROJECT_USER];
    public const FINANCE_ROLES = [self::ROLE_FINANCE_ADMIN, self::ROLE_FINANCE_USER];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'last_login_at',
        'disabled_reason',
        'disabled_by',
        'disabled_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'disabled_at' => 'datetime',
        ];
    }

    public function googleCalendarAccount()
    {
        return $this->hasOne(GoogleCalendarAccount::class);
    }

    public function googleCalendarAccounts()
    {
        return $this->hasMany(GoogleCalendarAccount::class);
    }

    // Role checking methods
    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, self::ADMIN_ROLES);
    }

    public function isUser(): bool
    {
        return in_array($this->role, self::USER_ROLES);
    }

    public function hasRole(string|array $roles): bool
    {
        if (is_array($roles)) {
            return in_array($this->role, $roles);
        }
        return $this->role === $roles;
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }

    // Segment checking methods
    public function isSalesSegment(): bool
    {
        return in_array($this->role, self::SALES_ROLES);
    }

    public function isDevSegment(): bool
    {
        return in_array($this->role, self::DEV_ROLES);
    }

    public function isProjectSegment(): bool
    {
        return in_array($this->role, self::PROJECT_ROLES);
    }

    public function isFinanceSegment(): bool
    {
        return in_array($this->role, self::FINANCE_ROLES);
    }

    public function getSegment(): ?string
    {
        if ($this->isSuperAdmin()) {
            return 'super_admin';
        }
        
        if ($this->isSalesSegment()) {
            return 'sales';
        }
        
        if ($this->isDevSegment()) {
            return 'dev';
        }
        
        if ($this->isProjectSegment()) {
            return 'project';
        }
        
        if ($this->isFinanceSegment()) {
            return 'finance';
        }
        
        return null;
    }

    public function isSegmentAdmin(): bool
    {
        return $this->isAdmin() && !$this->isSuperAdmin();
    }

    // Permissions helper
    public function can($ability, $arguments = []): bool
    {
        // Super admin can do everything
        if ($this->isSuperAdmin()) {
            return true;
        }

        return parent::can($ability, $arguments);
    }

    // User status management methods
    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function isDisabled(): bool
    {
        return !$this->is_active;
    }

    public function disable(string $reason = null, User $disabledBy = null): void
    {
        $this->update([
            'is_active' => false,
            'disabled_reason' => $reason,
            'disabled_by' => $disabledBy?->id,
            'disabled_at' => now(),
        ]);
    }

    public function enable(): void
    {
        $this->update([
            'is_active' => true,
            'disabled_reason' => null,
            'disabled_by' => null,
            'disabled_at' => null,
        ]);
    }

    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }

    // Relationships for user management
    public function disabledByUser()
    {
        return $this->belongsTo(User::class, 'disabled_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    public function scopeBySegment($query, string $segment)
    {
        $roles = match ($segment) {
            'sales' => self::SALES_ROLES,
            'dev' => self::DEV_ROLES,
            'project' => self::PROJECT_ROLES,
            'finance' => self::FINANCE_ROLES,
            default => [],
        };

        return $query->whereIn('role', $roles);
    }

    // Campaign relationships
    public function campaigns()
    {
        return $this->belongsToMany(Campaign::class, 'campaign_users', 'user_id', 'campaign_id')
            ->withTimestamps();
    }

    public function createdCampaigns()
    {
        return $this->hasMany(Campaign::class, 'created_by');
    }
}
