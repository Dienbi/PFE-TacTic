<?php

namespace Tests\Feature\Dashboard;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class DashboardApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_load_dashboard_stats(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->getJson('/api/dashboard/rh-stats')
            ->assertOk()
            ->assertJsonStructure([
                'total_employees',
                'attendance_rate',
            ]);
    }

    /** @test */
    public function rh_can_load_dashboard_all_without_ai(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->getJson('/api/dashboard/all?with_ai=0&noCache=1')
            ->assertOk()
            ->assertJsonStructure([
                'stats',
                'trend',
                'absence',
            ]);
    }

    /** @test */
    public function guest_cannot_access_dashboard(): void
    {
        $this->getJson('/api/dashboard/rh-stats')->assertUnauthorized();
    }
}
