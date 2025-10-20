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
        Schema::create('company_proposal', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->integer('company_id');
            $table->decimal('one_time_fees', 10, 2)->nullable();
            $table->decimal('annual_subscription', 10, 2)->nullable();
            $table->text('other_info')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent();

            $table->foreign('company_id')->references('id')->on('company');
            $table->foreign('created_by')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_proposal');
    }
};


