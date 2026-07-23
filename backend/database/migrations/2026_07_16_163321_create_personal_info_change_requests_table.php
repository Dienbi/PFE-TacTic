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
        Schema::create('personal_info_change_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->enum('requested_marital_status', ['single', 'married', 'divorced', 'widowed'])->nullable();
            $table->integer('requested_children_count')->nullable();
            $table->integer('requested_disabled_children_count')->nullable();
            $table->integer('requested_student_children_count')->nullable();
            $table->boolean('computed_head_of_family_preview')->default(false);
            $table->date('claimed_effective_date');
            $table->enum('status', ['pending', 'approved', 'rejected', 'needs_more_info'])->default('pending');
            $table->timestamp('submitted_at');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->boolean('affects_locked_payslips')->default(false);
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('id')->on('utilisateurs')->onDelete('set null');
            $table->index(['employee_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_info_change_requests');
    }
};
