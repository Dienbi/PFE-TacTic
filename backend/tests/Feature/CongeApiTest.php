<?php

namespace Tests\Feature;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Enums\StatutConge;
use App\Enums\TypeConge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class CongeApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function employee_can_submit_leave_request(): void
    {
        $employee = $this->createTestUser([
            'solde_conge' => 20,
            'role' => Role::EMPLOYE,
        ]);

        $payload = [
            'type' => TypeConge::ANNUEL->value,
            'date_debut' => Carbon::tomorrow()->toDateString(),
            'date_fin' => Carbon::tomorrow()->addDays(2)->toDateString(),
            'motif' => 'Family leave',
        ];

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/conges', $payload)
            ->assertCreated()
            ->assertJsonPath('utilisateur_id', $employee->id)
            ->assertJsonPath('type', TypeConge::ANNUEL->value)
            ->assertJsonPath('statut', StatutConge::EN_ATTENTE->value);

        $this->assertDatabaseHas('conges', [
            'utilisateur_id' => $employee->id,
            'type' => TypeConge::ANNUEL->value,
            'statut' => StatutConge::EN_ATTENTE->value,
        ]);
    }

    /** @test */
    public function leave_request_requires_valid_dates(): void
    {
        $employee = $this->createTestUser();

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/conges', [
                'type' => TypeConge::ANNUEL->value,
                'date_debut' => Carbon::tomorrow()->addDays(5)->toDateString(),
                'date_fin' => Carbon::tomorrow()->toDateString(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date_fin']);
    }

    /** @test */
    public function employee_cannot_approve_leave_request(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);
        $requester = $this->createTestUser(['email' => 'requester@tactic.test']);
        $conge = $this->createTestConge($requester);

        $this
            ->actingAsApiUser($employee)
            ->postJson("/api/conges/{$conge->id}/approuver")
            ->assertForbidden()
            ->assertJsonStructure(['message']);

        $this->assertDatabaseHas('conges', [
            'id' => $conge->id,
            'statut' => StatutConge::EN_ATTENTE->value,
            'approuve_par' => null,
        ]);
    }

    /** @test */
    public function rh_can_approve_leave_request_and_update_employee_state(): void
    {
        Event::fake();

        $rh = $this->createTestUser([
            'role' => Role::RH,
            'email' => 'rh@tactic.test',
        ]);
        $employee = $this->createTestUser([
            'email' => 'leave.employee@tactic.test',
            'solde_conge' => 20,
        ]);
        $conge = $this->createTestConge($employee, [
            'type' => TypeConge::ANNUEL,
            'date_debut' => Carbon::tomorrow(),
            'date_fin' => Carbon::tomorrow()->addDays(2),
            'statut' => StatutConge::EN_ATTENTE,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->postJson("/api/conges/{$conge->id}/approuver")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertDatabaseHas('conges', [
            'id' => $conge->id,
            'statut' => StatutConge::APPROUVE->value,
            'approuve_par' => $rh->id,
        ]);

        $this->assertDatabaseHas('utilisateurs', [
            'id' => $employee->id,
            'status' => EmployeStatus::EN_CONGE->value,
            'solde_conge' => 17,
        ]);
    }
}
