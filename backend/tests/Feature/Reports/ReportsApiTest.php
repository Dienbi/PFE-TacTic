<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class ReportsApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_load_ai_reports(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->getJson('/api/reports/ai?noCache=1')
            ->assertOk()
            ->assertJsonStructure([
                'ai_available',
                'attendance_predictions',
                'performance_scores',
                'ai_kpis',
            ]);
    }

    /** @test */
    public function employee_cannot_access_ai_reports(): void
    {
        $employee = $this->createTestUser();

        $this
            ->actingAsApiUser($employee)
            ->getJson('/api/reports/ai')
            ->assertForbidden();
    }
}
