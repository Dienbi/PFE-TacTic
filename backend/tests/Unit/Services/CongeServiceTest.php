<?php

namespace Tests\Unit\Services;

use App\Enums\StatutConge;
use App\Enums\TypeConge;
use App\Models\Conge;
use App\Services\CongeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
use Tests\TestHelpers;

class CongeServiceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private CongeService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(CongeService::class);
    }

    /** @test */
    public function it_calculates_leave_duration_on_request(): void
    {
        $employee = $this->createTestUser(['solde_conge' => 10]);

        $result = $this->service->demander($employee->id, [
            'type' => TypeConge::ANNUEL->value,
            'date_debut' => Carbon::tomorrow()->toDateString(),
            'date_fin' => Carbon::tomorrow()->addDays(2)->toDateString(),
        ]);

        $this->assertInstanceOf(Conge::class, $result);
        $this->assertEquals(3, $result->nombre_jours);
    }

    /** @test */
    public function it_detects_leave_conflicts(): void
    {
        $employee = $this->createTestUser(['solde_conge' => 20]);
        $start = Carbon::tomorrow();
        $end = Carbon::tomorrow()->addDays(3);

        $this->createTestConge($employee, [
            'date_debut' => $start,
            'date_fin' => $end,
            'statut' => StatutConge::APPROUVE,
        ]);

        $result = $this->service->demander($employee->id, [
            'type' => TypeConge::ANNUEL->value,
            'date_debut' => $start->copy()->addDay()->toDateString(),
            'date_fin' => $end->copy()->subDay()->toDateString(),
        ]);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('error', $result);
    }

    /** @test */
    public function it_rejects_request_when_balance_is_insufficient(): void
    {
        $employee = $this->createTestUser(['solde_conge' => 1]);

        $result = $this->service->demander($employee->id, [
            'type' => TypeConge::ANNUEL->value,
            'date_debut' => Carbon::tomorrow()->toDateString(),
            'date_fin' => Carbon::tomorrow()->addDays(4)->toDateString(),
        ]);

        $this->assertIsArray($result);
        $this->assertStringContainsString('insuffisant', $result['error']);
    }

    /** @test */
    public function it_deducts_balance_on_approval(): void
    {
        $rh = $this->createTestRh();
        $employee = $this->createTestUser(['solde_conge' => 15]);
        $conge = $this->createTestConge($employee, [
            'date_debut' => Carbon::tomorrow(),
            'date_fin' => Carbon::tomorrow()->addDays(2),
            'statut' => StatutConge::EN_ATTENTE,
        ]);

        $this->service->approuver($conge->id, $rh->id);

        $this->assertEquals(12, $employee->fresh()->solde_conge);
    }

    /** @test */
    public function it_does_not_approve_leave_twice(): void
    {
        $rh = $this->createTestRh();
        $conge = $this->createTestConge($this->createTestUser(), [
            'statut' => StatutConge::APPROUVE,
            'approuve_par' => $rh->id,
        ]);

        $this->assertFalse($this->service->approuver($conge->id, $rh->id));
    }

    /** @test */
    public function rejection_does_not_deduct_balance(): void
    {
        $rh = $this->createTestRh();
        $employee = $this->createTestUser(['solde_conge' => 15]);
        $conge = $this->createTestConge($employee, ['statut' => StatutConge::EN_ATTENTE]);

        $this->service->refuser($conge->id, $rh->id, 'Not approved');

        $this->assertEquals(15, $employee->fresh()->solde_conge);
        $this->assertEquals(StatutConge::REFUSE, $conge->fresh()->statut);
    }
}
