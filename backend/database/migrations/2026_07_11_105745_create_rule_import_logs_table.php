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
        Schema::create('rule_import_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rule_set_id')->nullable();
            $table->text('uploaded_pdf_ref');
            $table->json('ai_raw_output_json');
            $table->json('proposed_changes_json');
            $table->uuid('reviewed_by')->nullable();
            $table->json('review_decisions_json')->nullable();
            $table->enum('status', ['pending_review', 'confirmed', 'rejected'])->default('pending_review');
            $table->timestamps();
            
            $table->foreign('rule_set_id')->references('id')->on('fiscal_rule_sets');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rule_import_logs');
    }
};
