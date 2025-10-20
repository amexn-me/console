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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, number, json, etc.
            $table->timestamps();
        });

        // Insert default currency conversion rates
        DB::table('settings')->insert([
            ['key' => 'currency_rate_sar_to_aed', 'value' => '1.00', 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'currency_rate_myr_to_aed', 'value' => '0.82', 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
