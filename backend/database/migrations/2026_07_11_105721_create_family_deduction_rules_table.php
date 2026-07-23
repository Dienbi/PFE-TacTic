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
        Schema::create('family_deduction_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rule_set_id');
            $table->enum('deduction_type', ['head_of_household', 'child', 'disabled_child', 'student_child_non_scholarship']);
            $table->decimal('annual_amount', 12, 3);
            $table->integer('max_count')->nullable();
            $table->timestamps();
            
            $table->foreign('rule_set_id')->references('id')->on('fiscal_rule_sets')->onDelete('cascade');
            $table->index('rule_set_id');
            $table->index('deduction_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('family_deduction_rules');
    }
};
