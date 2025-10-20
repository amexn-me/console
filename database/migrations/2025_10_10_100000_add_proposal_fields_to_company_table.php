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
        Schema::table('company', function (Blueprint $table) {
            $table->string('proposal_currency', 10)->nullable()->after('lockin_date');
            $table->decimal('proposal_one_time_fees', 15, 2)->nullable()->after('proposal_currency');
            $table->decimal('proposal_annual_subscription', 15, 2)->nullable()->after('proposal_one_time_fees');
            $table->text('proposal_other_info')->nullable()->after('proposal_annual_subscription');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn([
                'proposal_currency',
                'proposal_one_time_fees',
                'proposal_annual_subscription',
                'proposal_other_info',
            ]);
        });
    }
};

