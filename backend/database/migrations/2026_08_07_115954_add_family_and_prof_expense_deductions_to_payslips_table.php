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
        Schema::table('payslips', function (Blueprint $table) {
            $table->decimal('family_deduction_total', 12, 3)->default(0)->after('css_amount');
            $table->decimal('prof_expense_deduction', 12, 3)->default(0)->after('family_deduction_total');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['family_deduction_total', 'prof_expense_deduction']);
        });
    }
};
