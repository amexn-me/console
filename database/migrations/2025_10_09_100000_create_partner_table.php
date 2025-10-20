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
        Schema::create('partner', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->string('name', 200);
            $table->string('email', 200)->nullable();
            $table->text('partnership_model')->nullable();
            $table->text('notes')->nullable();
            $table->string('contract_status', 50)->default('Early Stage');
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('partner');
    }
};


