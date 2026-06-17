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
            $table->foreignId('reviewer_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->decimal('score', 5, 2);
            $table->string('period', 20)->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index(['utilisateur_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_reviews');
    }
};
