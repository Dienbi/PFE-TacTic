<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performance_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->foreignId('chef_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->decimal('score', 2, 1); // Range 1.0-10.0
            $table->text('message');
            $table->date('review_date');
            $table->timestamps();

            // Unique constraint: one feedback per employee per manager per month
            $table->unique(['utilisateur_id', 'chef_id', 'review_date'], 'unique_monthly_feedback');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_reviews');
    }
};
