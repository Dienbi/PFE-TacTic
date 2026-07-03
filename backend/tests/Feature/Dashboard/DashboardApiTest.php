<?php

namespace Tests\Feature\Dashboard;

use App\Enums\Role;
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
    public function rh_can_load_dashboard_all(): void
    {
        $rh = $this->createTestRh();
        $this->actingAsApiUser($rh);

        $response = $this->getJson('/api/dashboard/all');

        $response->assertOk();
        $response->assertJsonStructure([
            'stats',
            'trend',
            'absence',
            'recent_leaves',
            'pending_requests',
            'recent_logs',
        ]);
    }

    /** @test */
    public function employee_cannot_access_dashboard(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);
        $this->actingAsApiUser($employee);

        $response = $this->getJson('/api/dashboard/all');

        $response->assertForbidden();
    }
}
