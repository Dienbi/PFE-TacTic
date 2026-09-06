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
        // Drop child tables first (due to foreign key constraints)
        Schema::dropIfExists('employee_fiscal_profile_assignments');
        Schema::dropIfExists('employee_fiscal_profiles');
        Schema::dropIfExists('fiscal_profile_groups');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration cannot be reversed as it deletes data
        // To restore, you would need to recreate the tables from backups
    }
};
