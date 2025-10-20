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
            $table->decimal('subscription', 10, 2)->nullable()->after('one_time_fees');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_proposal', function (Blueprint $table) {
            $table->dropColumn('subscription');
        });
    }
};
