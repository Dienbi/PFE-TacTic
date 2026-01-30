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
        Schema::create('account_requests', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenom');
            $table->string('personal_email')->unique();
            $table->string('status')->default('PENDING'); // PENDING, APPROVED, REJECTED
            $table->string('rejection_reason')->nullable();
            $table->string('generated_email')->nullable(); // firstname.lastname@tactic.com
            $table->string('temp_token')->nullable()->unique();
            $table->timestamp('token_expires_at')->nullable();
            $table->boolean('token_used')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_requests');
    }
};
