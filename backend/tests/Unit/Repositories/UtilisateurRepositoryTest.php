<?php

namespace Tests\Unit\Repositories;

use App\Enums\EmployeStatus;
use App\Enums\Role;
use App\Models\Utilisateur;
use App\Repositories\UtilisateurRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

class UtilisateurRepositoryTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private UtilisateurRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(UtilisateurRepository::class);
    }

    /** @test */
    public function it_finds_user_by_email(): void
    {
        $user = $this->createTestUser(['email' => 'findme@tactic.test']);

        $found = $this->repository->findByEmail('findme@tactic.test');

        $this->assertNotNull($found);
        $this->assertEquals($user->id, $found->id);
    }

    /** @test */
    public function it_counts_active_users(): void
    {
        $this->createTestUser(['actif' => true]);
        $this->createTestUser(['actif' => false, 'email' => 'inactive@tactic.test']);

        $this->assertEquals(1, $this->repository->countActifs());
    }

    /** @test */
    public function it_updates_leave_balance(): void
    {
        $user = $this->createTestUser(['solde_conge' => 20]);

        $this->repository->updateSoldeConge($user->id, 3);

        $this->assertEquals(17, $user->fresh()->solde_conge);
    }

    /** @test */
    public function it_updates_employee_status(): void
    {
        $user = $this->createTestUser();

        $this->repository->updateStatus($user->id, EmployeStatus::EN_CONGE);

        $this->assertEquals(EmployeStatus::EN_CONGE, $user->fresh()->status);
    }

    /** @test */
    public function it_archives_and_restores_users(): void
    {
        $user = $this->createTestUser();

        $this->assertTrue($this->repository->archive($user->id));
        $this->assertTrue(Utilisateur::withTrashed()->find($user->id)->trashed());

        $this->assertTrue($this->repository->restore($user->id));
        $this->assertFalse(Utilisateur::withTrashed()->find($user->id)->trashed());
    }

    /** @test */
    public function it_searches_users_by_name(): void
    {
        $this->createTestUser(['nom' => 'UniqueSurname', 'email' => 'unique@tactic.test']);

        $results = $this->repository->searchByName('UniqueSurname');

        $this->assertCount(1, $results);
    }

    /** @test */
    public function it_filters_users_by_role(): void
    {
        $this->createTestRh(['email' => 'rh.filter@tactic.test']);
        $this->createTestUser(['role' => Role::EMPLOYE, 'email' => 'emp.filter@tactic.test']);

        $results = $this->repository->getByRole(Role::RH);

        $this->assertTrue($results->every(fn ($u) => $u->role === Role::RH));
    }
}
