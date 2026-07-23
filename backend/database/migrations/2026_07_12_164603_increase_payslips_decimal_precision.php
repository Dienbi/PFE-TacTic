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
            $table->decimal('base_salary_used', 15, 3)->change();
            $table->decimal('gross_salary', 15, 3)->change();
            $table->decimal('cnss_employee_amount', 15, 3)->change();
            $table->decimal('cnss_employer_amount', 15, 3)->change();
            $table->decimal('taxable_base_annual', 15, 3)->change();
            $table->decimal('irpp_annual', 15, 3)->change();
            $table->decimal('irpp_monthly', 15, 3)->change();
            $table->decimal('css_amount', 15, 3)->change();
            $table->decimal('net_salary', 15, 3)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->decimal('base_salary_used', 12, 3)->change();
            $table->decimal('gross_salary', 12, 3)->change();
            $table->decimal('cnss_employee_amount', 12, 3)->change();
            $table->decimal('cnss_employer_amount', 12, 3)->change();
            $table->decimal('taxable_base_annual', 12, 3)->change();
            $table->decimal('irpp_annual', 12, 3)->change();
            $table->decimal('irpp_monthly', 12, 3)->change();
            $table->decimal('css_amount', 12, 3)->change();
            $table->decimal('net_salary', 12, 3)->change();
        });
    }
};
