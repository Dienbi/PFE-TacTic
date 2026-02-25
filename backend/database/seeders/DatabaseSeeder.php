<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Clean all tables before seeding (safe re-run)
        DB::statement('SET session_replication_role = replica');
        DB::statement('TRUNCATE TABLE
            ai_recommendations,
            activity_logs,
            account_requests,
            job_applications,
            job_post_competence,
            job_posts,
            job_requests,
            paies,
            pointages,
            conges,
            affectations,
            postes,
            utilisateur_competence,
            equipes,
            competences,
            utilisateurs
            RESTART IDENTITY CASCADE
        ');
        DB::statement('SET session_replication_role = DEFAULT');

        $this->call([
            UtilisateurSeeder::class,
            CompetenceSeeder::class,
            EquipeSeeder::class,
            FullDataSeeder::class,
        ]);
    }
}
