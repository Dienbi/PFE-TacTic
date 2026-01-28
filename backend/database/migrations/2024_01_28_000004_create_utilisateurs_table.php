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
        Schema::create('utilisateurs', function (Blueprint $table) {
            $table->id();
            $table->string('matricule')->unique();
            $table->string('nom');
            $table->string('prenom');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('telephone')->nullable();
            $table->string('adresse')->nullable();
            $table->date('date_embauche')->nullable();
            $table->string('type_contrat')->default('CDI'); // CDI, CDD, STAGE, FREELANCE
            $table->decimal('salaire_base', 10, 2)->default(0);
            $table->string('status')->default('DISPONIBLE'); // DISPONIBLE, AFFECTE, EN_CONGE
            $table->string('role')->default('EMPLOYE'); // RH, CHEF_EQUIPE, EMPLOYE
            $table->boolean('actif')->default(true);
            $table->integer('solde_conge')->default(30);
            $table->foreignId('equipe_id')->nullable()->constrained('equipes')->nullOnDelete();
            $table->timestamp('date_derniere_connexion')->nullable();
            $table->timestamps();
        });

        // Add foreign key for chef_equipe_id in equipes table
        Schema::table('equipes', function (Blueprint $table) {
            $table->foreign('chef_equipe_id')->references('id')->on('utilisateurs')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipes', function (Blueprint $table) {
            $table->dropForeign(['chef_equipe_id']);
        });
        Schema::dropIfExists('utilisateurs');
    }
};
