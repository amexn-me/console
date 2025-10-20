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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('lead_id');
            $table->integer('company_id')->unsigned(false);
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('project_id')->nullable();
            $table->string('contract_number')->unique()->nullable();
            $table->string('status')->default('draft'); // draft, active, completed, terminated
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->integer('partner_id')->nullable();
            
            // Financial details
            $table->string('currency', 10)->default('AED');
            $table->decimal('one_time_fees', 15, 2)->nullable();
            $table->decimal('annual_subscription', 15, 2)->nullable();
            $table->text('other_info')->nullable();
            
            // Important dates
            $table->date('go_live_date')->nullable();
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->date('signed_date')->nullable();
            
            // Milestone-based payment info (to be expanded later)
            $table->json('payment_milestones')->nullable();
            $table->text('notes')->nullable();
            
            $table->timestamps();

            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('company')->onDelete('cascade');
            $table->foreign('campaign_id')->references('id')->on('campaigns')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');
            $table->foreign('agent_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('partner_id')->references('id')->on('partner')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
