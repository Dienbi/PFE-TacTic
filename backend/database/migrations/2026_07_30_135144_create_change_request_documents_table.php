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
        Schema::create('change_request_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('change_request_id');
            $table->foreign('change_request_id')->references('id')->on('personal_info_change_requests')->onDelete('cascade');
            $table->enum('document_type', ['marriage_certificate', 'divorce_judgment', 'death_certificate', 'birth_certificate', 'disability_certificate', 'school_enrollment_certificate']);
            $table->text('file_path');
            $table->timestamp('uploaded_at')->useCurrent();
            $table->boolean('verified_by_hr')->default(false);
            $table->foreignId('verified_by')->nullable()->constrained('utilisateurs');
            $table->text('verification_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('change_request_documents');
    }
};
