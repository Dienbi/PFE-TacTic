<?php

namespace Tests\Feature\Security;

use App\Enums\Role;
use App\Models\Paie;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class AuthorizationTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function employee_cannot_manage_users(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);
        $countBefore = Utilisateur::count();

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/utilisateurs', [
                'nom' => 'Blocked',
                'prenom' => 'User',
                'email' => 'blocked.user@tactic.test',
                'password' => 'password',
                'role' => Role::EMPLOYE->value,
            ])
            ->assertForbidden();

        $this->assertEquals($countBefore, Utilisateur::count());
    }

    /** @test */
    public function employee_cannot_generate_payroll(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);
        $target = $this->createTestUser(['email' => 'payroll.target@tactic.test']);
        $countBefore = Paie::count();

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/paies/generer', [
                'utilisateur_id' => $target->id,
                'periode_debut' => Carbon::parse('2026-01-01')->toDateString(),
                'periode_fin' => Carbon::parse('2026-01-31')->toDateString(),
            ])
            ->assertForbidden();

        $this->assertEquals($countBefore, Paie::count());
    }

    /** @test */
    public function employee_cannot_create_poste(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/postes', [
                'titre' => 'Blocked Position',
                'statut' => 'ACTIF',
            ])
            ->assertForbidden();
    }

    /** @test */
    public function employee_cannot_access_attendance_summary(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->getJson('/api/pointages/summary')
            ->assertForbidden();
    }
}
