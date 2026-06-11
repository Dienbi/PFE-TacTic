<?php

namespace Tests\Feature\Pointages;

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

        $this
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

        $this->actingAsApiUser($employee)
            ->postJson('/api/pointages/entree')
            ->assertOk();

        $this
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
    public function employee_cannot_clock_out_without_clocking_in(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/pointages/sortie')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['heure_sortie']);
    }

    /** @test */
    public function employee_cannot_clock_in_twice_same_day(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this->actingAsApiUser($employee)
            ->postJson('/api/pointages/entree')
            ->assertOk();

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/pointages/entree')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['heure_entree']);

        $this->assertEquals(1, Pointage::where('utilisateur_id', $employee->id)->count());
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
    public function rh_can_view_pointage_summary(): void
    {
        $rh = $this->createTestRh();

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
