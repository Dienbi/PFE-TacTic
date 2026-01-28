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
        Schema::create('conges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->string('type')->default('ANNUEL'); // ANNUEL, MALADIE, SANS_SOLDE
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('statut')->default('EN_ATTENTE'); // EN_ATTENTE, APPROUVE, REFUSE
            $table->text('motif')->nullable();
            $table->foreignId('approuve_par')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conges');
    }
};
