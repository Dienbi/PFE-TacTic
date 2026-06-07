<?php

namespace Tests\Feature;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Enums\TypeContrat;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class UtilisateurApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_create_user(): void
    {
        $rh = $this->createTestUser([
            'role' => Role::RH,
            'email' => 'rh.create@tactic.test',
        ]);

        $payload = [
            'nom' => 'Created',
            'prenom' => 'User',
            'email' => 'created.user@tactic.test',
            'password' => 'password',
            'telephone' => '22000000',
            'adresse' => 'Tunis',
            'date_embauche' => Carbon::parse('2026-01-10')->toDateString(),
            'type_contrat' => TypeContrat::CDI->value,
            'salaire_base' => 1800,
            'status' => EmployeStatus::DISPONIBLE->value,
            'role' => Role::EMPLOYE->value,
            'actif' => true,
            'solde_conge' => 24,
        ];

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/utilisateurs', $payload)
            ->assertCreated()
            ->assertJsonPath('email', 'created.user@tactic.test')
            ->assertJsonPath('role', Role::EMPLOYE->value)
            ->assertJsonStructure([
                'id',
                'matricule',
                'nom',
                'prenom',
                'email',
                'role',
            ]);

        $this->assertDatabaseHas('utilisateurs', [
            'email' => 'created.user@tactic.test',
            'role' => Role::EMPLOYE->value,
            'actif' => true,
        ]);
    }

    /** @test */
    public function employee_cannot_create_user(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/utilisateurs', [
                'nom' => 'Blocked',
                'prenom' => 'User',
                'email' => 'blocked.user@tactic.test',
                'password' => 'password',
                'role' => Role::EMPLOYE->value,
            ])
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }

    /** @test */
    public function rh_can_update_user(): void
    {
        $rh = $this->createTestUser([
            'role' => Role::RH,
            'email' => 'rh.update@tactic.test',
        ]);
        $user = $this->createTestUser([
            'email' => 'before.update@tactic.test',
            'salaire_base' => 1500,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->putJson("/api/utilisateurs/{$user->id}", [
                'nom' => 'Updated',
                'prenom' => 'Employee',
                'email' => 'after.update@tactic.test',
                'telephone' => '22111111',
                'adresse' => 'Sfax',
                'date_embauche' => Carbon::parse('2026-02-01')->toDateString(),
                'type_contrat' => TypeContrat::CDD->value,
                'salaire_base' => 2300,
                'status' => EmployeStatus::DISPONIBLE->value,
                'role' => Role::EMPLOYE->value,
                'actif' => true,
                'solde_conge' => 20,
            ])
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertDatabaseHas('utilisateurs', [
            'id' => $user->id,
            'nom' => 'Updated',
            'prenom' => 'Employee',
            'email' => 'after.update@tactic.test',
            'salaire_base' => '2300.00',
        ]);
    }

    /** @test */
    public function rh_can_archive_and_restore_user(): void
    {
        $rh = $this->createTestUser([
            'role' => Role::RH,
            'email' => 'rh.archive@tactic.test',
        ]);
        $user = $this->createTestUser(['email' => 'archive.target@tactic.test']);

        $this
            ->actingAsApiUser($rh)
            ->deleteJson("/api/utilisateurs/{$user->id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertTrue(Utilisateur::withTrashed()->findOrFail($user->id)->trashed());

        $this
            ->actingAsApiUser($rh)
            ->postJson("/api/utilisateurs/{$user->id}/restore")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertFalse(Utilisateur::withTrashed()->findOrFail($user->id)->trashed());
    }
}
