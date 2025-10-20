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
        Schema::create('activity', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->integer('company_id')->nullable();
            $table->integer('contact_id')->nullable();
            $table->string('activity_type', 50)->nullable();
            $table->string('conversation_method', 50)->nullable();
            $table->string('conversation_connected', 10)->nullable();
            $table->date('next_followup_date')->nullable();
            $table->string('remarks', 200)->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('next_followup_datetime')->nullable();

            $table->foreign('agent_id')->references('id')->on('users');
            $table->foreign('company_id')->references('id')->on('company');
            $table->foreign('contact_id')->references('id')->on('contact');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity');
    }
};


