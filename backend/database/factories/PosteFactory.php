<?php

namespace Database\Factories;

use App\Models\Poste;
use Illuminate\Database\Eloquent\Factories\Factory;

class PosteFactory extends Factory
{
    protected $model = Poste::class;

    public function definition(): array
    {
        return [
            'titre' => fake()->jobTitle(),
            'statut' => 'ACTIF',
            'description' => fake()->optional()->sentence(),
        ];
    }
}
