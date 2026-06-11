<?php

namespace Tests\Performance;

use App\Models\Pointage;
use App\Services\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
use Tests\TestHelpers;

class DashboardPerformanceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private DashboardService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(DashboardService::class);
    }

    /** @test */
    public function dashboard_statistics_are_loaded_efficiently(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $user = $this->createTestUser(['email' => "perf.dash{$i}@tactic.test"]);
            Pointage::create([
                'utilisateur_id' => $user->id,
                'date' => Carbon::today(),
                'heure_entree' => Carbon::today()->setTime(8, 30),
                'heure_sortie' => Carbon::today()->setTime(17, 0),
                'duree_travail' => 8.5,
            ]);
        }

        $this->assertQueryCount(
            fn () => $this->service->getRhDashboardStats(),
            15
        );
    }
}
