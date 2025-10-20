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
            // Change bigint columns to decimal
            $table->decimal('one_time_fees', 15, 2)->nullable()->change();
            $table->decimal('annual_subscription', 15, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_proposal', function (Blueprint $table) {
            $table->bigInteger('one_time_fees')->nullable()->change();
            $table->bigInteger('annual_subscription')->nullable()->change();
        });
    }
};

