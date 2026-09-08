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
        Schema::table('family_deduction_rules', function (Blueprint $table) {
            $table->string('deduction_type', 255)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('family_deduction_rules', function (Blueprint $table) {
            $table->enum('deduction_type', ['head_of_household', 'child', 'disabled_child', 'student_child_non_scholarship'])->change();
        });
    }
};
