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
            $table->string('currency', 10)->default('AED')->after('campaign_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_proposal', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }
};
