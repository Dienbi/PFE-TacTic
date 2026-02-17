<?php

namespace Database\Factories;

use App\Enums\StatutConge;
use App\Enums\TypeConge;
use App\Models\Conge;
use App\Models\Utilisateur;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

class CongeFactory extends Factory
{
    protected $model = Conge::class;

    public function definition(): array
    {
        $dateDebut = Carbon::tomorrow()->addDays(fake()->numberBetween(0, 30));
        $nombreJours = fake()->numberBetween(2, 10);
        $dateFin = $dateDebut->copy()->addDays($nombreJours - 1);

        return [
            'utilisateur_id' => Utilisateur::factory(),
            'type' => fake()->randomElement([TypeConge::ANNUEL, TypeConge::MALADIE, TypeConge::SANS_SOLDE]),
            'date_debut' => $dateDebut,
            'date_fin' => $dateFin,
            'motif' => fake()->optional()->sentence(),
            'statut' => StatutConge::EN_ATTENTE,
            'approuve_par' => null,
        ];
    }

    public function approuve(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => StatutConge::APPROUVE,
            'approuve_par' => Utilisateur::factory()->manager(),
        ]);
    }

    public function refuse(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => StatutConge::REFUSE,
            'approuve_par' => Utilisateur::factory()->manager(),
        ]);
    }

    public function annuel(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => TypeConge::ANNUEL,
        ]);
    }

    public function maladie(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => TypeConge::MALADIE,
        ]);
    }

    public function sansSolde(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => TypeConge::SANS_SOLDE,
        ]);
    }
}
