<?php

namespace Tests\Performance;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class DashboardPerformanceTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function dashboard_all_stays_within_query_budget(): void
    {
        $rh = $this->createTestRh();
        $this->actingAsApiUser($rh);

        $this->assertQueryCount(function () {
            $this->getJson('/api/dashboard/all');
        }, 15);
    }
}
