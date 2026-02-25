<?php

namespace Database\Seeders;

use App\Models\Competence;
use Illuminate\Database\Seeder;

class CompetenceSeeder extends Seeder
{
    public function run(): void
    {
        $competences = [
            // Technical
            ['nom' => 'PHP/Laravel', 'niveau' => 5],
            ['nom' => 'Python', 'niveau' => 5],
            ['nom' => 'JavaScript', 'niveau' => 5],
            ['nom' => 'React', 'niveau' => 5],
            ['nom' => 'TypeScript', 'niveau' => 5],
            ['nom' => 'Java', 'niveau' => 5],
            ['nom' => 'SQL/PostgreSQL', 'niveau' => 5],
            ['nom' => 'Node.js', 'niveau' => 5],
            ['nom' => 'Docker', 'niveau' => 5],
            ['nom' => 'Git', 'niveau' => 5],
            ['nom' => 'Machine Learning', 'niveau' => 5],
            ['nom' => 'DevOps/CI-CD', 'niveau' => 5],
            // Soft skills
            ['nom' => 'Communication', 'niveau' => 5],
            ['nom' => 'Leadership', 'niveau' => 5],
            ['nom' => 'Gestion de Projet', 'niveau' => 5],
            ['nom' => 'Travail en Equipe', 'niveau' => 5],
            // Domain
            ['nom' => 'Comptabilite', 'niveau' => 5],
            ['nom' => 'Marketing Digital', 'niveau' => 5],
            ['nom' => 'Ressources Humaines', 'niveau' => 5],
            ['nom' => 'Support Client', 'niveau' => 5],
        ];

        foreach ($competences as $c) {
            Competence::firstOrCreate(['nom' => $c['nom']], $c);
        }
    }
}
