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
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payslip_id');
            $table->enum('method', ['bank_transfer', 'cash', 'check']);
            $table->decimal('amount', 12, 3);
            $table->date('paid_at');
            $table->text('reference')->nullable();
            $table->uuid('created_by');
            $table->timestamps();
            
            $table->foreign('payslip_id')->references('id')->on('payslips')->onDelete('cascade');
            $table->index('payslip_id');
            $table->index('paid_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
