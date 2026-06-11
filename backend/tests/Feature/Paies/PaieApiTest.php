<?php

namespace Tests\Feature\Paies;

use App\Enums\Role;
use App\Enums\StatutPaie;
use App\Models\Paie;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class PaieApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_simulate_payroll(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/paies/simuler', [
                'salaire_base' => 2500,
                'heures_supp' => 4,
            ])
            ->assertOk()
            ->assertJsonStructure([
                'salaire_brut',
                'salaire_net',
                'cnss_employe',
                'impot_mensuel',
            ]);
    }

    /** @test */
    public function employee_cannot_generate_payroll(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);
        $target = $this->createTestUser(['email' => 'payroll.target@tactic.test']);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/paies/generer', [
                'utilisateur_id' => $target->id,
                'periode_debut' => Carbon::parse('2026-01-01')->toDateString(),
                'periode_fin' => Carbon::parse('2026-01-31')->toDateString(),
            ])
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }

    /** @test */
    public function rh_can_generate_payroll(): void
    {
        $rh = $this->createTestRh(['email' => 'payroll.rh@tactic.test']);
        $employee = $this->createTestUser([
            'email' => 'paid.employee@tactic.test',
            'salaire_base' => 2400,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/paies/generer', [
                'utilisateur_id' => $employee->id,
                'periode_debut' => Carbon::parse('2026-01-01')->toDateString(),
                'periode_fin' => Carbon::parse('2026-01-31')->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('utilisateur_id', $employee->id)
            ->assertJsonPath('statut', StatutPaie::GENERE->value)
            ->assertJsonStructure([
                'id',
                'utilisateur_id',
                'periode_debut',
                'periode_fin',
                'salaire_brut',
                'salaire_net',
            ]);

        $this->assertDatabaseHas('paies', [
            'utilisateur_id' => $employee->id,
            'statut' => StatutPaie::GENERE->value,
        ]);
    }

    /** @test */
    public function payroll_generation_validates_period_order(): void
    {
        $rh = $this->createTestRh();
        $employee = $this->createTestUser();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/paies/generer', [
                'utilisateur_id' => $employee->id,
                'periode_debut' => Carbon::parse('2026-01-31')->toDateString(),
                'periode_fin' => Carbon::parse('2026-01-01')->toDateString(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['periode_fin']);
    }

    /** @test */
    public function cannot_generate_same_payroll_twice(): void
    {
        $rh = $this->createTestRh();
        $employee = $this->createTestUser(['salaire_base' => 2000]);

        $payload = [
            'utilisateur_id' => $employee->id,
            'periode_debut' => Carbon::parse('2026-01-01')->toDateString(),
            'periode_fin' => Carbon::parse('2026-01-31')->toDateString(),
        ];

        $this->actingAsApiUser($rh)->postJson('/api/paies/generer', $payload)->assertCreated();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/paies/generer', $payload)
            ->assertStatus(400)
            ->assertJsonStructure(['message']);

        $this->assertEquals(1, Paie::where('utilisateur_id', $employee->id)->count());
    }

    /** @test */
    public function cannot_generate_payroll_for_nonexistent_employee(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/paies/generer', [
                'utilisateur_id' => 99999,
                'periode_debut' => Carbon::parse('2026-01-01')->toDateString(),
                'periode_fin' => Carbon::parse('2026-01-31')->toDateString(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['utilisateur_id']);
    }
}
