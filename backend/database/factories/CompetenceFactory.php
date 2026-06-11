<?php

namespace Database\Factories;

use App\Models\Competence;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompetenceFactory extends Factory
{
    protected $model = Competence::class;

    public function definition(): array
    {
        return [
            'nom' => fake()->unique()->words(2, true),
            'niveau' => fake()->numberBetween(1, 5),
        ];
    }
}
