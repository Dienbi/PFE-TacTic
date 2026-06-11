<?php

namespace Tests\Performance;

use App\Repositories\PaieRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

class PayrollPerformanceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private PaieRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(PaieRepository::class);
    }

    /** @test */
    public function it_fetches_last_payrolls_without_n_plus_one(): void
    {
        $userIds = [];
        for ($i = 0; $i < 10; $i++) {
            $user = $this->createTestUser(['email' => "perf.payroll{$i}@tactic.test"]);
            $this->createTestPaie($user);
            $userIds[] = $user->id;
        }

        $this->assertQueryCount(
            fn () => $this->repository->getLastPaiesForUsers($userIds),
            5
        );
    }
}
