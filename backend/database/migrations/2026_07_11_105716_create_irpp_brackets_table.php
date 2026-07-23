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
        Schema::create('irpp_brackets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rule_set_id');
            $table->integer('bracket_order');
            $table->decimal('min_annual_amount', 12, 3);
            $table->decimal('max_annual_amount', 12, 3)->nullable();
            $table->decimal('rate', 6, 4);
            $table->timestamps();
            
            $table->foreign('rule_set_id')->references('id')->on('fiscal_rule_sets')->onDelete('cascade');
            $table->index('rule_set_id');
            $table->index('bracket_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('irpp_brackets');
    }
};
