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
        Schema::create('company', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->string('name', 200);
            $table->string('stage', 50)->nullable();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->date('next_followup_date')->nullable();
            $table->date('first_qualified_stage_date')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
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

            $table->foreign('agent_id')->references('id')->on('users');
            $table->foreign('partner_id')->references('id')->on('partner');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company');
    }
};


