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
        Schema::create('contact', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->integer('company_id')->nullable();
            $table->string('name', 100);
            $table->string('title', 100)->nullable();
            $table->string('email', 200)->nullable();
            $table->string('phone1', 50)->nullable();
            $table->string('phone2', 50)->nullable();
            $table->string('linkedin_url', 500)->nullable();
            $table->boolean('is_pic')->nullable();
            $table->date('next_followup_date')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->boolean('do_not_contact')->default(false);
            $table->string('interest_level', 20)->default('Cold');
            $table->dateTime('next_followup_datetime')->nullable();
            $table->boolean('followup_completed')->default(false);
            $table->boolean('reminder_sent')->default(false);

            $table->foreign('company_id')->references('id')->on('company');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact');
    }
};


