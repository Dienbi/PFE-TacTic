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
        Schema::table('pointages', function (Blueprint $table) {
            $table->index(['date', 'heure_entree'], 'pointages_date_heure_entree_idx');
            $table->index(['date', 'absence_justifiee'], 'pointages_date_absence_idx');
        });

        Schema::table('conges', function (Blueprint $table) {
            $table->index(['statut', 'date_debut', 'date_fin'], 'conges_statut_dates_idx');
        });

        Schema::table('paies', function (Blueprint $table) {
            $table->index(['periode_debut', 'periode_fin'], 'paies_periode_idx');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index(['user_id', 'created_at'], 'activity_logs_user_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pointages', function (Blueprint $table) {
            $table->dropIndex('pointages_date_heure_entree_idx');
            $table->dropIndex('pointages_date_absence_idx');
        });

        Schema::table('conges', function (Blueprint $table) {
            $table->dropIndex('conges_statut_dates_idx');
        });

        Schema::table('paies', function (Blueprint $table) {
            $table->dropIndex('paies_periode_idx');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('activity_logs_user_created_idx');
        });
    }
};
