<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add performance indexes to frequently queried columns.
     */
    public function up(): void
    {
        // Conges: frequently filtered by statut and utilisateur_id
        Schema::table('conges', function (Blueprint $table) {
            $table->index(['utilisateur_id', 'statut'], 'idx_conges_utilisateur_statut');
            $table->index(['date_debut', 'date_fin'], 'idx_conges_dates');
            $table->index('statut', 'idx_conges_statut');
        });

        // Paies: filtered by utilisateur, period, and statut
        Schema::table('paies', function (Blueprint $table) {
            $table->index('utilisateur_id', 'idx_paies_utilisateur');
            $table->index(['periode_debut', 'periode_fin'], 'idx_paies_periode');
            $table->index('statut', 'idx_paies_statut');
        });

        // Utilisateurs: filtered by equipe, role, actif
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->index('equipe_id', 'idx_utilisateurs_equipe');
            $table->index('role', 'idx_utilisateurs_role');
            $table->index('actif', 'idx_utilisateurs_actif');
            $table->index('deleted_at', 'idx_utilisateurs_deleted_at');
        });

        // Pointages: filtered by date and utilisateur
        Schema::table('pointages', function (Blueprint $table) {
            $table->index('date', 'idx_pointages_date');
        });

        // Notifications: filtered by utilisateur
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (Schema::hasColumn('notifications', 'notifiable_id')) {
                    $table->index('notifiable_id', 'idx_notifications_notifiable');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conges', function (Blueprint $table) {
            $table->dropIndex('idx_conges_utilisateur_statut');
            $table->dropIndex('idx_conges_dates');
            $table->dropIndex('idx_conges_statut');
        });

        Schema::table('paies', function (Blueprint $table) {
            $table->dropIndex('idx_paies_utilisateur');
            $table->dropIndex('idx_paies_periode');
            $table->dropIndex('idx_paies_statut');
        });

        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropIndex('idx_utilisateurs_equipe');
            $table->dropIndex('idx_utilisateurs_role');
            $table->dropIndex('idx_utilisateurs_actif');
            $table->dropIndex('idx_utilisateurs_deleted_at');
        });

        Schema::table('pointages', function (Blueprint $table) {
            $table->dropIndex('idx_pointages_date');
        });

        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (Schema::hasIndex('notifications', 'idx_notifications_notifiable')) {
                    $table->dropIndex('idx_notifications_notifiable');
                }
            });
        }
    }
};
