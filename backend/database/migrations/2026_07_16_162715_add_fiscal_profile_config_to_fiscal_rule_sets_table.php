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
        Schema::table('fiscal_rule_sets', function (Blueprint $table) {
            $table->integer('max_future_effective_days')->default(0)->after('min_annual_tax');
            $table->integer('max_children_deduction')->nullable()->after('max_future_effective_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fiscal_rule_sets', function (Blueprint $table) {
            $table->dropColumn(['max_future_effective_days', 'max_children_deduction']);
        });
    }
};
