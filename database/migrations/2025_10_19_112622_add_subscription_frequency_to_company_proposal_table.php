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
        Schema::table('company_proposal', function (Blueprint $table) {
            $table->string('subscription_frequency', 50)->nullable()->after('annual_subscription');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_proposal', function (Blueprint $table) {
            $table->dropColumn('subscription_frequency');
        });
    }
};
