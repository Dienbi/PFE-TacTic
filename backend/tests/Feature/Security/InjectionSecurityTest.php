<?php

namespace Tests\Feature\Security;

use App\Enums\TypeConge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class InjectionSecurityTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function user_search_does_not_error_on_sql_injection_payload(): void
    {
        $rh = $this->createTestRh();
        $this->createTestUser(['nom' => 'SafeName', 'email' => 'safe@tactic.test']);

        $this
            ->actingAsApiUser($rh)
            ->getJson('/api/utilisateurs/search?q='.urlencode("'; DROP TABLE utilisateurs; --"))
            ->assertOk();
    }

    /** @test */
    public function leave_motif_stores_xss_payload_without_server_error(): void
    {
        $employee = $this->createTestUser(['solde_conge' => 10]);
        $payload = '<script>alert("xss")</script>';

        $response = $this
            ->actingAsApiUser($employee)
            ->postJson('/api/conges', [
                'type' => TypeConge::ANNUEL->value,
                'date_debut' => Carbon::tomorrow()->toDateString(),
                'date_fin' => Carbon::tomorrow()->addDays(1)->toDateString(),
                'motif' => $payload,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('conges', [
            'utilisateur_id' => $employee->id,
            'motif' => $payload,
        ]);

        $this->assertStringContainsString('<script>', $response->json('motif'));
    }
}
