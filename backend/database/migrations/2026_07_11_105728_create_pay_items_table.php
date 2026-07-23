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
        Schema::create('pay_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->enum('calculation_type', ['fixed_amount', 'percentage_of_base', 'formula'])->default('fixed_amount');
            $table->boolean('is_taxable')->default(true);
            $table->boolean('is_cnss_applicable')->default(true);
            $table->decimal('default_value', 12, 3)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            
            $table->index('active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pay_items');
    }
};
