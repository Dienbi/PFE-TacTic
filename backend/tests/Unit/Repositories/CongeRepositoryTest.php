<?php

namespace Tests\Unit\Repositories;

use App\Models\Conge;
use App\Models\Utilisateur;
use App\Repositories\CongeRepository;
use App\Enums\StatutConge;
use App\Enums\TypeConge;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

class CongeRepositoryTest extends TestCase
{
    use RefreshDatabase, TestHelpers;

    private CongeRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(CongeRepository::class);
    }

    /** @test */
    public function it_retrieves_leaves_by_user()
    {
        $user = $this->createTestUser();
        $this->createTestConge($user);
        $this->createTestConge($user);

        $conges = $this->repository->getByUtilisateur($user->id);

        $this->assertCount(2, $conges);
    }

    /** @test */
    public function it_retrieves_pending_leaves()
    {
        $user1 = $this->createTestUser(['email' => 'user1@tactic.com']);
        $user2 = $this->createTestUser(['email' => 'user2@tactic.com']);

        $this->createTestConge($user1, ['statut' => StatutConge::EN_ATTENTE]);
        $this->createTestConge($user2, ['statut' => StatutConge::EN_ATTENTE]);
        $this->createTestConge($user1, ['statut' => StatutConge::APPROUVE]);

        $pending = $this->repository->getEnAttente();

        $this->assertCount(2, $pending);
    }

    /** @test */
    public function it_approves_leave()
    {
        $user = $this->createTestUser();
        $manager = $this->createTestManager();
        $conge = $this->createTestConge($user, ['statut' => StatutConge::EN_ATTENTE]);

        $result = $this->repository->approuver($conge->id, $manager->id);

        $this->assertTrue($result);
        $conge->refresh();
        $this->assertEquals(StatutConge::APPROUVE, $conge->statut);
        $this->assertEquals($manager->id, $conge->approuve_par);
    }

    /** @test */
    public function it_rejects_leave()
    {
        $user = $this->createTestUser();
        $manager = $this->createTestManager();
        $conge = $this->createTestConge($user, ['statut' => StatutConge::EN_ATTENTE]);

        $result = $this->repository->refuser($conge->id, $manager->id);

        $this->assertTrue($result);
        $conge->refresh();
        $this->assertEquals(StatutConge::REFUSE, $conge->statut);
        $this->assertEquals($manager->id, $conge->approuve_par);
    }

    /** @test */
    public function it_retrieves_leaves_by_period()
    {
        $user = $this->createTestUser();

        $jan = $this->createTestConge($user, [
            'date_debut' => Carbon::parse('2024-01-10'),
            'date_fin' => Carbon::parse('2024-01-15'),
        ]);

        $feb = $this->createTestConge($user, [
            'date_debut' => Carbon::parse('2024-02-10'),
            'date_fin' => Carbon::parse('2024-02-15'),
        ]);

        $conges = $this->repository->getByPeriod(
            Carbon::parse('2024-01-01'),
            Carbon::parse('2024-01-31')
        );

        $this->assertCount(1, $conges);
        $this->assertEquals($jan->id, $conges->first()->id);
    }

    /** @test */
    public function it_retrieves_leaves_by_type()
    {
        $user = $this->createTestUser();

        $this->createTestConge($user, ['type' => TypeConge::ANNUEL]);
        $this->createTestConge($user, ['type' => TypeConge::ANNUEL]);
        $this->createTestConge($user, ['type' => TypeConge::MALADIE]);

        $annuelLeaves = $this->repository->getByType(TypeConge::ANNUEL);

        $this->assertCount(2, $annuelLeaves);
    }

    /** @test */
    public function it_detects_leave_conflicts_same_user()
    {
        $user = $this->createTestUser();

        // Existing leave from Jan 10-15
        $existing = $this->createTestConge($user, [
            'date_debut' => Carbon::parse('2024-01-10'),
            'date_fin' => Carbon::parse('2024-01-15'),
            'statut' => StatutConge::APPROUVE,
        ]);

        // Try to create overlapping leave Jan 12-17
        $hasConflict = $this->repository->hasConflict(
            $user->id,
            Carbon::parse('2024-01-12'),
            Carbon::parse('2024-01-17')
        );

        $this->assertTrue($hasConflict);
    }

    /** @test */
    public function it_does_not_detect_conflict_for_different_dates()
    {
        $user = $this->createTestUser();

        $this->createTestConge($user, [
            'date_debut' => Carbon::parse('2024-01-10'),
            'date_fin' => Carbon::parse('2024-01-15'),
            'statut' => StatutConge::APPROUVE,
        ]);

        // Non-overlapping leave Jan 20-25
        $hasConflict = $this->repository->hasConflict(
            $user->id,
            Carbon::parse('2024-01-20'),
            Carbon::parse('2024-01-25')
        );

        $this->assertFalse($hasConflict);
    }

    /** @test  */
    public function it_excludes_specific_leave_from_conflict_check()
    {
        $user = $this->createTestUser();

        $conge = $this->createTestConge($user, [
            'date_debut' => Carbon::parse('2024-01-10'),
            'date_fin' => Carbon::parse('2024-01-15'),
            'statut' => StatutConge::EN_ATTENTE,
        ]);

        // Checking same dates but excluding this leave (for updates)
        $hasConflict = $this->repository->hasConflict(
            $user->id,
            Carbon::parse('2024-01-10'),
            Carbon::parse('2024-01-15'),
            $conge->id
        );

        $this->assertFalse($hasConflict);
    }

    /** @test */
    public function it_retrieves_approved_leaves_by_period()
    {
        $user = $this->createTestUser();

        $approved = $this->createTestConge($user, [
            'date_debut' => Carbon::parse('2024-01-10'),
            'date_fin' => Carbon::parse('2024-01-15'),
            'statut' => StatutConge::APPROUVE,
        ]);

        $pending = $this->createTestConge($user, [
            'date_debut' => Carbon::parse('2024-01-20'),
            'date_fin' => Carbon::parse('2024-01-25'),
            'statut' => StatutConge::EN_ATTENTE,
        ]);

        $approvedLeaves = $this->repository->getApprouvesByPeriod(
            $user->id,
            Carbon::parse('2024-01-01'),
            Carbon::parse('2024-01-31')
        );

        $this->assertCount(1, $approvedLeaves);
        $this->assertEquals($approved->id, $approvedLeaves->first()->id);
    }
}
