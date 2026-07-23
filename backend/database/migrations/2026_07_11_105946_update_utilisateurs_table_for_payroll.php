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
        Schema::table('utilisateurs', function (Blueprint $table) {
            // Update salaire_base to 3 decimal places for millimes
            $table->decimal('salaire_base', 12, 3)->change();
            
            // Add termination date
            $table->date('date_fin_contrat')->nullable()->after('date_embauche');
            
            // Add sector for future agricultural regime support
            $table->string('secteur')->nullable()->after('type_contrat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropColumn(['date_fin_contrat', 'secteur']);
            $table->decimal('salaire_base', 10, 2)->change();
        });
    }
};
