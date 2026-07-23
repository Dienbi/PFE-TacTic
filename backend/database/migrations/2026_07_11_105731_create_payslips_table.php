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
        Schema::create('payslips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->date('pay_period_start');
            $table->date('pay_period_end');
            $table->uuid('rule_set_id');
            $table->decimal('base_salary_used', 12, 3);
            $table->decimal('gross_salary', 12, 3);
            $table->decimal('cnss_employee_amount', 12, 3);
            $table->decimal('cnss_employer_amount', 12, 3);
            $table->decimal('taxable_base_annual', 12, 3);
            $table->decimal('irpp_annual', 12, 3);
            $table->decimal('irpp_monthly', 12, 3);
            $table->decimal('css_amount', 12, 3);
            $table->decimal('net_salary', 12, 3);
            $table->enum('status', ['draft', 'validated', 'locked', 'superseded'])->default('draft');
            $table->integer('version')->default(1);
            $table->uuid('supersedes_payslip_id')->nullable();
            $table->boolean('is_regularization_adjustment')->default(false);
            $table->timestamp('generated_at');
            $table->uuid('generated_by');
            $table->timestamps();
            
            $table->foreign('rule_set_id')->references('id')->on('fiscal_rule_sets');
            $table->index('employee_id');
            $table->index('rule_set_id');
            $table->index('supersedes_payslip_id');
            $table->index('status');
            $table->index('pay_period_start');
            $table->index('pay_period_end');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
