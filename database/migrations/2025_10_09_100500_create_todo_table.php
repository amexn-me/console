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
        Schema::create('todo', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->integer('company_id')->nullable();
            $table->text('task');
            $table->boolean('is_completed')->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('completed_at')->nullable();

            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('company_id')->references('id')->on('company');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('todo');
    }
};


