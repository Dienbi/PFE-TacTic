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
        Schema::create('job_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_request_id')->nullable()->constrained('job_requests')->onDelete('set null');
            $table->string('titre');
            $table->text('description');
            $table->string('statut')->default('brouillon');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('created_by')->constrained('utilisateurs')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();

            $table->index('statut');
            $table->index('created_by');
            $table->index('published_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_posts');
    }
};
