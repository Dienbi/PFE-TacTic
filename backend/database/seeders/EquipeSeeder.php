<?php

namespace Database\Seeders;

use App\Models\Equipe;
use Illuminate\Database\Seeder;

class EquipeSeeder extends Seeder
{
    public function run(): void
    {
        $equipes = [
            ['nom' => 'Développement'],
            ['nom' => 'Ressources Humaines'],
            ['nom' => 'Marketing'],
            ['nom' => 'Finance'],
            ['nom' => 'Support Technique'],
        ];

        foreach ($equipes as $e) {
            Equipe::firstOrCreate(['nom' => $e['nom']], $e);
        }
    }
}
