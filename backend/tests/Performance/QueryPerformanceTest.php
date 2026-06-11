<?php

namespace Tests\Performance;

use App\Services\CongeService;
use App\Services\PaieService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class QueryPerformanceTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function paie_list_pagination_stays_within_query_budget(): void
    {
        $rh = $this->createTestRh();
        for ($i = 0; $i < 5; $i++) {
            $this->createTestPaie($this->createTestUser(['email' => "perf.paie.list{$i}@tactic.test"]));
        }

        $service = app(PaieService::class);

        $this->assertQueryCount(fn () => $service->getAllPaginated(10), 8);
    }

    /** @test */
    public function pending_leaves_batch_conflict_check_stays_within_query_budget(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->createTestConge($this->createTestUser(['email' => "perf.conge{$i}@tactic.test"]));
        }

        $service = app(CongeService::class);

        $this->assertQueryCount(fn () => $service->getEnAttente(), 12);
    }

    /** @test */
    public function utilisateur_index_stays_within_query_budget(): void
    {
        $rh = $this->createTestRh();
        for ($i = 0; $i < 5; $i++) {
            $this->createTestUser(['email' => "perf.user.index{$i}@tactic.test"]);
        }

        $this->assertQueryCount(
            fn () => $this->actingAsApiUser($rh)->getJson('/api/utilisateurs'),
            15
        );
    }
}
