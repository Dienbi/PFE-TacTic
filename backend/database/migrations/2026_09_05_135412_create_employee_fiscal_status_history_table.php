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
        Schema::create('employee_fiscal_status_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->enum('marital_status', ['single', 'married', 'divorced', 'widowed']);
            $table->integer('children_count');
            $table->integer('disabled_children_count')->default(0);
            $table->integer('student_non_scholarship_children_count')->default(0);
            $table->boolean('head_of_family');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->index(['employee_id', 'effective_from', 'effective_to'], 'fiscal_status_employee_effective_date_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_fiscal_status_history');
    }
};
