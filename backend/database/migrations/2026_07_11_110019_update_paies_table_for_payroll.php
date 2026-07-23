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
            // Update decimal fields to 3 decimal places for millimes
            $table->decimal('salaire_brut', 12, 3)->change();
            $table->decimal('taux_horaire', 12, 3)->change();
            $table->decimal('heures_normales', 5, 2)->change();
            $table->decimal('heures_supp', 5, 2)->change();
            $table->decimal('montant_heures_supp', 12, 3)->change();
            $table->decimal('deductions', 12, 3)->change();
            $table->decimal('cnss_employe', 12, 3)->change();
            $table->decimal('cnss_taux', 6, 4)->change();
            $table->decimal('impot_annuel', 12, 3)->change();
            $table->decimal('impot_mensuel', 12, 3)->change();
            $table->decimal('salaire_net', 12, 3)->change();
            
            // Add foreign key to new payslips table for backward compatibility
            $table->uuid('payslip_id')->nullable()->after('id');
            $table->foreign('payslip_id')->references('id')->on('payslips')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('paies', function (Blueprint $table) {
            $table->dropForeign(['payslip_id']);
            $table->dropColumn('payslip_id');
            
            $table->decimal('salaire_brut', 10, 2)->change();
            $table->decimal('taux_horaire', 10, 2)->change();
            $table->decimal('heures_normales', 5, 2)->change();
            $table->decimal('heures_supp', 5, 2)->change();
            $table->decimal('montant_heures_supp', 10, 2)->change();
            $table->decimal('deductions', 10, 2)->change();
            $table->decimal('cnss_employe', 10, 2)->change();
            $table->decimal('cnss_taux', 5, 2)->change();
            $table->decimal('impot_annuel', 10, 2)->change();
            $table->decimal('impot_mensuel', 10, 2)->change();
            $table->decimal('salaire_net', 10, 2)->change();
        });
    }
};
