<?php

namespace Tests\Performance;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

class DashboardPerformanceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function dashboard_all_stays_within_query_budget(): void
    {
        $rh = $this->createTestRh();
        $this->actingAsApiUser($rh);

        $this->assertQueryCount(15, function () {
            $this->getJson('/api/dashboard/all');
        });
    }
}
