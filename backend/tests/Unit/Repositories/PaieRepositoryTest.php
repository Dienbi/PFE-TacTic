<?php

namespace Tests\Unit\Repositories;

use App\Models\Paie;
use App\Models\Utilisateur;
use App\Repositories\PaieRepository;
use App\Enums\StatutPaie;
use App\Enums\EmployeStatus;
use App\Enums\Role;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

class PaieRepositoryTest extends TestCase
{
    use RefreshDatabase, TestHelpers;

    private PaieRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(PaieRepository::class);
    }

    /** @test */
    public function it_retrieves_paies_by_user()
    {
        $user = $this->createTestUser();
        $this->createTestPaie($user);
        $this->createTestPaie($user);

        $paies = $this->repository->getByUtilisateur($user->id);

        $this->assertCount(2, $paies);
    }

    /** @test */
    public function it_retrieves_paies_by_period()
    {
        $user = $this->createTestUser();
        $startDate = Carbon::parse('2024-01-01');
        $endDate = Carbon::parse('2024-01-31');

        $this->createTestPaie($user, [
            'periode_debut' => $startDate,
            'periode_fin' => $endDate,
        ]);

        $this->createTestPaie($user, [
            'periode_debut' => Carbon::parse('2024-02-01'),
            'periode_fin' => Carbon::parse('2024-02-28'),
        ]);

        $paies = $this->repository->getByPeriod($startDate, $endDate);

        $this->assertCount(1, $paies);
    }

    /** @test */
    public function it_retrieves_non_paid_paies()
    {
        $user = $this->createTestUser();

        $this->createTestPaie($user, ['statut' => StatutPaie::GENERE]);
        $this->createTestPaie($user, ['statut' => StatutPaie::VALIDE]);
        $this->createTestPaie($user, ['statut' => StatutPaie::PAYE]);

        $nonPaid = $this->repository->getNonPayees();

        $this->assertCount(2, $nonPaid);
    }

    /** @test */
    public function it_marks_paie_as_paid()
    {
        $user = $this->createTestUser();
        $paie = $this->createTestPaie($user, ['statut' => StatutPaie::VALIDE]);

        $result = $this->repository->marquerPayee($paie->id);

        $this->assertTrue($result);
        $paie->refresh();
        $this->assertEquals(StatutPaie::PAYE, $paie->statut);
        $this->assertNotNull($paie->date_paiement);
    }

    /** @test */
    public function it_validates_paie()
    {
        $user = $this->createTestUser();
        $paie = $this->createTestPaie($user, ['statut' => StatutPaie::GENERE]);

        $result = $this->repository->valider($paie->id);

        $this->assertTrue($result);
        $paie->refresh();
        $this->assertEquals(StatutPaie::VALIDE, $paie->statut);
    }

    /** @test */
    public function it_gets_last_paie_for_user()
    {
        $user = $this->createTestUser();

        $oldPaie = $this->createTestPaie($user, [
            'periode_fin' => Carbon::parse('2024-01-31'),
        ]);

        $recentPaie = $this->createTestPaie($user, [
            'periode_fin' => Carbon::parse('2024-02-28'),
        ]);

        $lastPaie = $this->repository->getLastPaie($user->id);

        $this->assertNotNull($lastPaie);
        $this->assertEquals($recentPaie->id, $lastPaie->id);
    }

    /** @test */
    public function it_gets_last_paies_for_multiple_users_avoiding_n_plus_one()
    {
        $user1 = $this->createTestUser(['email' => 'user1@tactic.com']);
        $user2 = $this->createTestUser(['email' => 'user2@tactic.com']);

        $this->createTestPaie($user1);
        $this->createTestPaie($user2);

        // This should execute only a few queries, not N+1
        $result = $this->repository->getLastPaiesForUsers([$user1->id, $user2->id]);

        $this->assertCount(2, $result);
        $this->assertArrayHasKey($user1->id, $result);
        $this->assertArrayHasKey($user2->id, $result);
    }

    /** @test */
    public function it_checks_if_paie_exists_for_period()
    {
        $user = $this->createTestUser();
        $startDate = Carbon::parse('2024-01-01');
        $endDate = Carbon::parse('2024-01-31');

        $this->createTestPaie($user, [
            'periode_debut' => $startDate,
            'periode_fin' => $endDate,
        ]);

        $exists = $this->repository->existsForPeriod($user->id, $startDate, $endDate);
        $notExists = $this->repository->existsForPeriod($user->id, Carbon::parse('2024-02-01'), Carbon::parse('2024-02-28'));

        $this->assertTrue($exists);
        $this->assertFalse($notExists);
    }

    /** @test */
    public function it_calculates_global_stats_with_aggregates()
    {
        $user1 = $this->createTestUser(['email' => 'user1@tactic.com']);
        $user2 = $this->createTestUser(['email' => 'user2@tactic.com']);

        $currentMonth = Carbon::now();

        // Current month paies
        $this->createTestPaie($user1, [
            'periode_debut' => $currentMonth->copy()->startOfMonth(),
            'salaire_brut' => 1000,
            'salaire_net' => 800,
            'cnss_employe' => 91.80,
            'impot_mensuel' => 108.20,
            'deductions' => 200,
            'statut' => StatutPaie::VALIDE,
        ]);

        $this->createTestPaie($user2, [
            'periode_debut' => $currentMonth->copy()->startOfMonth(),
            'salaire_brut' => 1500,
            'salaire_net' => 1200,
            'cnss_employe' => 137.70,
            'impot_mensuel' => 162.30,
            'deductions' => 300,
            'statut' => StatutPaie::PAYE,
        ]);

        // Old month paie (should not be counted in monthly stats)
        $this->createTestPaie($user1, [
            'periode_debut' => $currentMonth->copy()->subMonths(2)->startOfMonth(),
            'salaire_brut' => 1000,
            'statut' => StatutPaie::PAYE,
        ]);

        $stats = $this->repository->getGlobalStats();

        $this->assertEquals(3, $stats['total_paies']);
        $this->assertEquals(2500.00, $stats['total_masse_salariale']); // Current month only
        $this->assertEquals(2000.00, $stats['total_net_mensuel']);
        $this->assertEquals(1, $stats['paies_validees']);
        $this->assertEquals(1, $stats['paies_payees']);
        $this->assertEquals(2, $stats['paies_mois_courant']);
    }

    /** @test */
    public function it_retrieves_paies_by_status()
    {
        $user = $this->createTestUser();

        $this->createTestPaie($user, ['statut' => StatutPaie::GENERE]);
        $this->createTestPaie($user, ['statut' => StatutPaie::GENERE]);
        $this->createTestPaie($user, ['statut' => StatutPaie::VALIDE]);

        $generated = $this->repository->getByStatut(StatutPaie::GENERE);

        $this->assertCount(2, $generated);
    }
}
