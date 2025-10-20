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
            $table->string('file_category', 50)->default('other')->after('lead_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_files', function (Blueprint $table) {
            $table->dropColumn('file_category');
        });
    }
};
