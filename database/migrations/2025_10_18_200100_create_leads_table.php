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
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->integer('company_id')->unsigned(false);
            $table->string('stage', 50)->nullable();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->date('next_followup_date')->nullable();
            $table->date('first_qualified_stage_date')->nullable();
            $table->dateTime('pic_not_identified_date')->nullable();
            $table->dateTime('pic_identified_date')->nullable();
            $table->dateTime('contacted_date')->nullable();
            $table->dateTime('disqualified_date')->nullable();
            $table->dateTime('demo_requested_date')->nullable();
            $table->dateTime('demo_completed_date')->nullable();
            $table->dateTime('proposal_date')->nullable();
            $table->dateTime('closed_won_date')->nullable();
            $table->dateTime('closed_lost_date')->nullable();
            $table->dateTime('questionnaire_sent_date')->nullable();
            $table->dateTime('questionnaire_replied_date')->nullable();
            $table->integer('partner_id')->nullable();
            $table->date('lockin_date')->nullable();
            $table->string('proposal_currency', 10)->nullable();
            $table->decimal('proposal_one_time_fees', 15, 2)->nullable();
            $table->decimal('proposal_annual_subscription', 15, 2)->nullable();
            $table->text('proposal_other_info')->nullable();
            $table->timestamps();

            $table->foreign('campaign_id')->references('id')->on('campaigns')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('company')->onDelete('cascade');
            $table->foreign('agent_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('partner_id')->references('id')->on('partner')->onDelete('set null');

            // Unique constraint: one company can only be added once per campaign
            $table->unique(['campaign_id', 'company_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};

