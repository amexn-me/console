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
        Schema::table('company_files', function (Blueprint $table) {
            $table->unsignedBigInteger('project_id')->nullable()->after('lead_id');
            $table->unsignedBigInteger('contract_id')->nullable()->after('project_id');
            
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_files', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
            $table->dropForeign(['contract_id']);
            $table->dropColumn(['project_id', 'contract_id']);
        });
    }
};
