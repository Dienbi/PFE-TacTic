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
        Schema::create('employee_fiscal_profile_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->uuid('fiscal_profile_group_id');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->uuid('source_change_request_id')->nullable();
            $table->unsignedBigInteger('assigned_by');
            $table->timestamp('assigned_at');
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->foreign('fiscal_profile_group_id')->references('id')->on('fiscal_profile_groups')->onDelete('cascade');
            $table->foreign('source_change_request_id')->references('id')->on('personal_info_change_requests')->onDelete('set null');
            $table->foreign('assigned_by')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->index(['employee_id', 'effective_from', 'effective_to'], 'employee_effective_date_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_fiscal_profile_assignments');
    }
};
