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
        Schema::create('role_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('name');
            $table->enum('horaire_type', ['fixed', 'shift', 'hourly']);
            $table->enum('salary_type', ['fixed_monthly', 'hourly', 'commission', 'piece_rate']);
            $table->decimal('weekly_hours', 5, 2)->nullable();
            $table->boolean('overtime_eligible')->default(false);
            $table->decimal('overtime_rate_multiplier', 4, 2)->nullable();
            $table->decimal('base_salary_min', 12, 3)->nullable();
            $table->decimal('base_salary_max', 12, 3)->nullable();
            $table->text('cnss_regime')->nullable();
            $table->text('label');
            $table->timestamps();

            $table->unique('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_profiles');
    }
};
