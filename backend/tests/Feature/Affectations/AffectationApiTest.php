<?php

namespace Tests\Feature\Affectations;

use App\Enums\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class AffectationApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_create_affectation(): void
    {
        $rh = $this->createTestRh();
        $employee = $this->createTestUser();
        $poste = $this->createTestPoste();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/affectations', [
                'utilisateur_id' => $employee->id,
                'poste_id' => $poste->id,
                'date_debut' => Carbon::today()->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('utilisateur_id', $employee->id)
            ->assertJsonPath('poste_id', $poste->id);

        $this->assertDatabaseHas('affectations', [
            'utilisateur_id' => $employee->id,
            'poste_id' => $poste->id,
        ]);
    }

    /** @test */
    public function employee_cannot_create_affectation(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);
        $poste = $this->createTestPoste();

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/affectations', [
                'utilisateur_id' => $employee->id,
                'poste_id' => $poste->id,
                'date_debut' => Carbon::today()->toDateString(),
            ])
            ->assertForbidden();
    }
}
