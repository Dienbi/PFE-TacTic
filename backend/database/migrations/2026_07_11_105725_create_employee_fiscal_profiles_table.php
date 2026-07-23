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
        Schema::create('employee_fiscal_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->date('effective_from');
            $table->enum('marital_status', ['single', 'head_of_household'])->default('single');
            $table->integer('children_count')->default(0);
            $table->integer('disabled_children_count')->default(0);
            $table->integer('student_non_scholarship_children_count')->default(0);
            $table->timestamps();
            
            $table->index('employee_id');
            $table->index('effective_from');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_fiscal_profiles');
    }
};
