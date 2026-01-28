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
        Schema::create('paies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->date('periode_debut');
            $table->date('periode_fin');
            $table->decimal('salaire_brut', 10, 2);
            $table->decimal('deductions', 10, 2)->default(0);
            $table->decimal('heures_supp', 5, 2)->default(0);
            $table->decimal('salaire_net', 10, 2);
            $table->date('date_paiement')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paies');
    }
};
