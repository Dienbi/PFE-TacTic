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
        Schema::create('head_of_family_overrides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('employee_id');
            $table->boolean('overridden_value');
            $table->text('justification_note');
            $table->text('document_file_path')->nullable();
            $table->unsignedBigInteger('approved_by');
            $table->timestamp('approved_at');
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('utilisateurs')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('utilisateurs')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('head_of_family_overrides');
    }
};
