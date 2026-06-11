<?php

namespace Database\Factories;

use App\Models\Equipe;
use Illuminate\Database\Eloquent\Factories\Factory;

class EquipeFactory extends Factory
{
    protected $model = Equipe::class;

    public function definition(): array
    {
        return [
            'nom' => fake()->unique()->words(2, true) . ' Team',
            'chef_equipe_id' => null,
        ];
    }
}
