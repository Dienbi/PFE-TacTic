<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pointages', function (Blueprint $table) {
            // Index for user-specific date range queries (history, reports)
            $table->index(['utilisateur_id', 'date'], 'idx_pointages_user_date');
        });

        Schema::table('conges', function (Blueprint $table) {
            // Index for checking overlapping leaves more efficiently
            $table->index(['date_debut', 'date_fin', 'statut'], 'idx_conges_range_statut');
        });

        Schema::table('utilisateurs', function (Blueprint $table) {
            // Index for status filtering (available employees, etc.)
            $table->index(['status', 'actif'], 'idx_utilisateurs_status_actif');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            // Index for filtering by action type
            $table->index('action', 'idx_activity_logs_action');
        });

        Schema::table('utilisateur_competence', function (Blueprint $table) {
            // Composite index for pivot table lookups
            $table->index(['utilisateur_id', 'competence_id'], 'idx_user_competence_lookup');
        });
    }

    public function down(): void
    {
        Schema::table('pointages', function (Blueprint $table) {
            $table->dropIndex('idx_pointages_user_date');
        });

        Schema::table('conges', function (Blueprint $table) {
            $table->dropIndex('idx_conges_range_statut');
        });

        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropIndex('idx_utilisateurs_status_actif');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('idx_activity_logs_action');
        });

        Schema::table('utilisateur_competence', function (Blueprint $table) {
            $table->dropIndex('idx_user_competence_lookup');
        });
    }
};
