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
        Schema::create('fiscal_rule_sets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('year');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->enum('status', ['draft', 'confirmed', 'superseded'])->default('draft');
            $table->decimal('cnss_employee_rate', 6, 4);
            $table->decimal('cnss_employer_rate', 6, 4);
            $table->decimal('cnss_monthly_ceiling', 12, 3)->nullable();
            $table->decimal('css_rate', 6, 4);
            $table->decimal('css_exempt_annual_net_threshold', 12, 3);
            $table->decimal('prof_expense_rate', 6, 4);
            $table->decimal('prof_expense_annual_cap', 12, 3);
            $table->decimal('min_annual_tax', 12, 3);
            $table->text('source_pdf_ref')->nullable();
            $table->uuid('confirmed_by')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
            
            $table->index('year');
            $table->index('status');
            $table->index('effective_from');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fiscal_rule_sets');
    }
};
