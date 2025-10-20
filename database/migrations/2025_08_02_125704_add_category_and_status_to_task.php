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
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['is_completed']); // Remove is_completed column
            $table->string('category',25)->nullable(); // e.g. work, personal, urgent
            $table->string('status',15)->default('pending'); // e.g. pending, in_progress, completed
            $table->string('country',2)->nullable(); // e.g. country of the task
            $table->string('project',25)->nullable(); // e.g. state of the task
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['category', 'status']);
            $table->dropColumn(['country', 'project']);
            $table->boolean('is_completed')->default(false); // Re-add is_completed column
            
        });
    }
};
