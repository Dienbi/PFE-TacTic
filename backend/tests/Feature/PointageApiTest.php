<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Pointage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class PointageApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function employee_can_clock_in(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $response = $this
            ->actingAsApiUser($employee)
            ->postJson('/api/pointages/entree')
            ->assertOk()
            ->assertJsonStructure([
                'message',
                'pointage' => [
                    'id',
                    'utilisateur_id',
                    'date',
                    'heure_entree',
                ],
            ]);

        $this->assertDatabaseHas('pointages', [
            'utilisateur_id' => $employee->id,
            'date' => Carbon::today()->toDateString(),
        ]);
    }

    /** @test */
    public function employee_can_clock_out(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        // First clock in
        $this->actingAsApiUser($employee)
            ->postJson('/api/pointages/entree')
            ->assertOk();

        // Then clock out
        $response = $this
            ->actingAsApiUser($employee)
            ->postJson('/api/pointages/sortie')
            ->assertOk()
            ->assertJsonStructure([
                'message',
                'pointage' => [
                    'id',
                    'utilisateur_id',
                    'date',
                    'heure_entree',
                    'heure_sortie',
                ],
            ]);

        $this->assertDatabaseHas('pointages', [
            'utilisateur_id' => $employee->id,
            'date' => Carbon::today()->toDateString(),
        ]);
    }

    /** @test */
    public function employee_can_view_own_pointages(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->getJson('/api/pointages/mes-pointages')
            ->assertOk()
            ->assertJsonStructure([
                'current_page',
                'data',
                'total',
            ]);
    }

    /** @test */
    public function rh_can_view_pointages_summary(): void
    {
        $rh = $this->createTestUser(['role' => Role::RH]);

        $this
            ->actingAsApiUser($rh)
            ->getJson('/api/pointages/summary')
            ->assertOk()
            ->assertJsonStructure([
                'date',
                'stats' => [
                    'total_employees',
                    'present_count',
                    'late_count',
                    'absent_count',
                    'currently_in_count',
                ],
                'lists' => [
                    'present',
                    'late',
                    'absent',
                    'currently_in',
                ],
            ]);
    }

    /** @test */
    public function employee_cannot_view_summary(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->getJson('/api/pointages/summary')
            ->assertForbidden();
    }
}
