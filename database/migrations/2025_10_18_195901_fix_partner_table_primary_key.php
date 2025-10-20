<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add primary key constraint to partner table's id column
        DB::statement('ALTER TABLE partner ADD PRIMARY KEY (id)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove primary key constraint
        DB::statement('ALTER TABLE partner DROP CONSTRAINT partner_pkey');
    }
};

