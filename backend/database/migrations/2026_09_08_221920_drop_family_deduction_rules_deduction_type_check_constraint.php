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
        DB::statement('ALTER TABLE family_deduction_rules DROP CONSTRAINT IF EXISTS family_deduction_rules_deduction_type_check');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('family_deduction_rules', function (Blueprint $table) {
            $table->raw('ALTER TABLE family_deduction_rules ADD CONSTRAINT family_deduction_rules_deduction_type_check CHECK (deduction_type IN (\'head_of_household\', \'child\', \'disabled_child\', \'student_child_non_scholarship\'))');
        });
    }
};
