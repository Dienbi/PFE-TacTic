<?php

namespace Tests\Unit\Repositories;

use App\Models\Pointage;
use App\Repositories\PointageRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
use Tests\TestHelpers;

class PointageRepositoryTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private PointageRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(PointageRepository::class);
    }

    /** @test */
    public function it_gets_today_pointage_for_user(): void
    {
        $user = $this->createTestUser();
        Pointage::create([
            'utilisateur_id' => $user->id,
            'date' => Carbon::today(),
            'heure_entree' => Carbon::today()->setTime(8, 0),
            'duree_travail' => 0,
        ]);

        $pointage = $this->repository->getTodayPointage($user->id);

        $this->assertNotNull($pointage);
        $this->assertEquals($user->id, $pointage->utilisateur_id);
    }

    /** @test */
    public function it_records_clock_in_and_clock_out(): void
    {
        $user = $this->createTestUser();

        $checkIn = $this->repository->pointer($user->id, 'entree');
        $this->assertNotNull($checkIn->heure_entree);

        $checkOut = $this->repository->pointer($user->id, 'sortie');
        $this->assertNotNull($checkOut->heure_sortie);
    }

    /** @test */
    public function it_paginates_user_pointages(): void
    {
        $user = $this->createTestUser();
        for ($i = 0; $i < 3; $i++) {
            Pointage::create([
                'utilisateur_id' => $user->id,
                'date' => Carbon::today()->subDays($i),
                'heure_entree' => Carbon::today()->setTime(8, 0),
                'duree_travail' => 8,
            ]);
        }

        $result = $this->repository->getByUtilisateurPaginated($user->id, 2, 1);

        $this->assertCount(2, $result['data']);
        $this->assertEquals(3, $result['total']);
        $this->assertEquals(1, $result['current_page']);
    }

    /** @test */
    public function it_gets_pointages_by_date(): void
    {
        $user = $this->createTestUser();
        $date = Carbon::today();
        Pointage::create([
            'utilisateur_id' => $user->id,
            'date' => $date,
            'heure_entree' => Carbon::today()->setTime(8, 0),
            'duree_travail' => 0,
        ]);

        $results = $this->repository->getByDate($date);

        $this->assertCount(1, $results);
    }
}
