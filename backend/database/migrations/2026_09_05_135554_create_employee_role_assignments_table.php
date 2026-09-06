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
        Schema::create('employee_role_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->uuid('role_profile_id');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->unsignedBigInteger('assigned_by');
            $table->timestamp('assigned_at');
            $table->uuid('source_change_request_id')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->foreign('role_profile_id')->references('id')->on('role_profiles')->onDelete('cascade');
            $table->foreign('assigned_by')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->index(['employee_id', 'effective_from', 'effective_to'], 'role_assignment_employee_effective_date_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_role_assignments');
    }
};
