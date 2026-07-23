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
        Schema::create('payslip_pay_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payslip_id');
            $table->uuid('pay_item_id');
            $table->string('name_snapshot');
            $table->decimal('amount', 12, 3);
            $table->boolean('was_taxable');
            $table->boolean('was_cnss_applicable');
            $table->timestamps();
            
            $table->foreign('payslip_id')->references('id')->on('payslips')->onDelete('cascade');
            $table->foreign('pay_item_id')->references('id')->on('pay_items');
            $table->index('payslip_id');
            $table->index('pay_item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslip_pay_items');
    }
};
