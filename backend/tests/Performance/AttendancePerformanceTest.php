<?php

namespace Tests\Performance;

use App\Models\Pointage;
use App\Services\PointageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
use Tests\TestHelpers;

class AttendancePerformanceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private PointageService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PointageService::class);
    }

    /** @test */
    public function attendance_summary_executes_under_expected_query_count(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $user = $this->createTestUser(['email' => "perf.att{$i}@tactic.test"]);
            if ($i % 2 === 0) {
                Pointage::create([
                    'utilisateur_id' => $user->id,
                    'date' => Carbon::today(),
                    'heure_entree' => Carbon::today()->setTime(8, 0),
                    'duree_travail' => 0,
                ]);
            }
        }

        $this->assertQueryCount(
            fn () => $this->service->getSummary(Carbon::today()),
            10
        );
    }
}
