<?php

namespace Database\Factories;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Enums\TypeContrat;
use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UtilisateurFactory extends Factory
{
    protected $model = Utilisateur::class;

    public function definition(): array
    {
        return [
            'nom' => fake()->lastName(),
            'prenom' => fake()->firstName(),
            'email' => fake()->unique()->safeEmail(),
            'matricule' => 'EMP' . fake()->unique()->numberBetween(1000, 9999),
            'password' => Hash::make('password'),
            'telephone' => fake()->phoneNumber(),
            'adresse' => fake()->address(),
            'role' => Role::EMPLOYE,
            'status' => EmployeStatus::DISPONIBLE,
            'type_contrat' => TypeContrat::CDI,
            'date_embauche' => fake()->date('Y-m-d', '-2 years'),
            'salaire_base' => fake()->randomFloat(2, 800, 3000),
            'solde_conge' => fake()->numberBetween(0, 30),
            'actif' => true,
            'date_derniere_connexion' => now(),
        ];
    }

    public function manager(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::CHEF_EQUIPE,
            'salaire_base' => fake()->randomFloat(2, 2000, 5000),
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::RH,
            'salaire_base' => fake()->randomFloat(2, 3000, 6000),
        ]);
    }

    public function rh(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::RH,
            'salaire_base' => fake()->randomFloat(2, 2500, 5500),
        ]);
    }

    public function enConge(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => EmployeStatus::EN_CONGE,
        ]);
    }

    public function cdd(): static
    {
        return $this->state(fn (array $attributes) => [
            'type_contrat' => TypeContrat::CDD,
        ]);
    }
}
