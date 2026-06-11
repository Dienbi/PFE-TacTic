<?php

namespace Tests\Feature\Security;

use App\Enums\TypeConge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class ValidationSecurityTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function poste_creation_requires_titre(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/postes', ['statut' => 'ACTIF'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre']);
    }

    /** @test */
    public function competence_creation_requires_nom(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/competences', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nom']);
    }

    /** @test */
    public function leave_request_rejects_invalid_date_order(): void
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
}
