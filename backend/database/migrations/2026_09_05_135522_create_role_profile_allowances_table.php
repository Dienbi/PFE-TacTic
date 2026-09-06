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
        Schema::create('role_profile_allowances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('role_profile_id');
            $table->enum('allowance_type', ['transport', 'meal', 'housing', 'other']);
            $table->decimal('amount', 12, 3);
            $table->boolean('is_percentage')->default(false);
            $table->timestamps();

            $table->foreign('role_profile_id')->references('id')->on('role_profiles')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_profile_allowances');
    }
};
