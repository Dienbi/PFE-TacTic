<?php

namespace Tests;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Enums\StatutPaie;
use App\Enums\StatutConge;
use App\Enums\TypeConge;
use App\Models\Utilisateur;
use App\Models\Paie;
use App\Models\Conge;
use App\Models\Equipe;
use Carbon\Carbon;

trait TestHelpers
{
    /**
     * Create a test user with default values
     */
    protected function createTestUser(array $attributes = []): Utilisateur
    {
        return Utilisateur::factory()->create(array_merge([
            'nom' => 'TestNom',
            'prenom' => 'TestPrenom',
            'email' => fake()->unique()->safeEmail(),
            'matricule' => 'TEST' . fake()->unique()->numberBetween(100, 999),
            'role' => Role::EMPLOYE,
            'status' => EmployeStatus::DISPONIBLE,
            'salaire_base' => 1000.00,
            'solde_conge' => 24,            'actif' => true,        ], $attributes));
    }

    /**
     * Create a test manager user
     */
    protected function createTestManager(array $attributes = []): Utilisateur
    {
        return $this->createTestUser(array_merge([
            'role' => Role::CHEF_EQUIPE,
            'salaire_base' => 2000.00,
        ], $attributes));
    }

    /**
     * Create a test payroll record
     */
    protected function createTestPaie(Utilisateur $user, array $attributes = []): Paie
    {
        return Paie::factory()->create(array_merge([
            'utilisateur_id' => $user->id,
            'salaire_brut' => 1000.00,
            'salaire_net' => 800.00,
            'statut' => StatutPaie::GENERE,
            'periode_debut' => Carbon::now()->startOfMonth(),
            'periode_fin' => Carbon::now()->endOfMonth(),
        ], $attributes));
    }

    /**
     * Create a test leave request
     */
    protected function createTestConge(Utilisateur $user, array $attributes = []): Conge
    {
        return Conge::factory()->create(array_merge([
            'utilisateur_id' => $user->id,
            'type' => TypeConge::ANNUEL,
            'statut' => StatutConge::EN_ATTENTE,
            'date_debut' => Carbon::tomorrow(),
            'date_fin' => Carbon::tomorrow()->addDays(3),
        ], $attributes));
    }

    /**
     * Create a test team
     */
    protected function createTestEquipe(Utilisateur $manager, array $attributes = []): Equipe
    {
        return Equipe::factory()->create(array_merge([
            'nom' => 'Test Team',
            'chef_equipe_id' => $manager->id,
        ], $attributes));
    }

    /**
     * Assert that a payroll calculation is correct
     */
    protected function assertPayrollCalculationCorrect(array $calculation, float $expectedNet): void
    {
        $this->assertArrayHasKey('salaire_brut', $calculation);
        $this->assertArrayHasKey('salaire_net', $calculation);
        $this->assertArrayHasKey('cnss_employe', $calculation);
        $this->assertArrayHasKey('impot_mensuel', $calculation);
        $this->assertEquals($expectedNet, $calculation['salaire_net'], '', 0.01);
    }
}
