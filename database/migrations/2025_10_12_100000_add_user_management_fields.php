<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('password');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            $table->string('disabled_reason')->nullable()->after('last_login_at');
            $table->foreignId('disabled_by')->nullable()->constrained('users')->nullOnDelete()->after('disabled_reason');
            $table->timestamp('disabled_at')->nullable()->after('disabled_by');
            
            $table->index('is_active');
            $table->index('last_login_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropIndex(['last_login_at']);
            
            $table->dropForeign(['disabled_by']);
            $table->dropColumn([
                'is_active',
                'last_login_at',
                'disabled_reason',
                'disabled_by',
                'disabled_at',
            ]);
        });
    }
};

