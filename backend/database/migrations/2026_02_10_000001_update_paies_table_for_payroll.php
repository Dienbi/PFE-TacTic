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
        Schema::table('paies', function (Blueprint $table) {
            // Payroll configuration fields
            $table->decimal('taux_horaire', 10, 2)->default(0)->after('salaire_brut');
            $table->decimal('heures_normales', 5, 2)->default(0)->after('taux_horaire');
            $table->decimal('montant_heures_supp', 10, 2)->default(0)->after('heures_supp');

            // CNSS & Tax breakdowns
            $table->decimal('cnss_employe', 10, 2)->default(0)->after('deductions');
            $table->decimal('cnss_taux', 5, 2)->default(9.68)->after('cnss_employe');
            $table->decimal('impot_annuel', 10, 2)->default(0)->after('cnss_taux');
            $table->decimal('impot_mensuel', 10, 2)->default(0)->after('impot_annuel');

            // Status tracking
            $table->string('statut')->default('GENERE')->after('date_paiement'); // GENERE, VALIDE, PAYE
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('paies', function (Blueprint $table) {
            $table->dropColumn([
                'taux_horaire',
                'heures_normales',
                'montant_heures_supp',
                'cnss_employe',
                'cnss_taux',
                'impot_annuel',
                'impot_mensuel',
                'statut',
            ]);
        });
    }
};
