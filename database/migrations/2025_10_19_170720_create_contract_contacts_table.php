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
        Schema::create('contract_contacts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contract_id');
            $table->integer('contact_id');
            $table->timestamps();

            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');
            // Note: Not adding foreign key for contact_id due to existing schema constraints
            // but will maintain referential integrity at application level
            
            $table->unique(['contract_id', 'contact_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contract_contacts');
    }
};
