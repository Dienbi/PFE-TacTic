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

        $response = $this
            ->actingAsApiUser($rh)
            ->getJson('/api/dashboard/all?noCache=1')
            ->assertOk()
            ->assertJsonStructure([
                'stats',
                'trend',
                'absence',
                'recent_leaves',
                'pending_requests',
                'recent_logs',
            ]);

        $payload = $response->json();
        $this->assertArrayNotHasKey('ai_attendance', $payload);
        $this->assertArrayNotHasKey('ai_performance', $payload);
        $this->assertArrayNotHasKey('ai_kpis', $payload);
    }

    /** @test */
    public function guest_cannot_access_dashboard(): void
    {
        $this->getJson('/api/dashboard/rh-stats')->assertUnauthorized();
    }
}
