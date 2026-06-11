<?php

namespace Tests\Unit\Services;

use App\Enums\StatutPaie;
use App\Events\SalaryPaid;
use App\Models\Paie;
use App\Services\PaieService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;
use Tests\TestHelpers;

class PaieServiceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private PaieService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PaieService::class);
    }

    /** @test */
    public function it_simulates_payroll_calculation(): void
    {
        $result = $this->service->simuler(2500, 0);

        $this->assertArrayHasKey('salaire_brut', $result);
        $this->assertArrayHasKey('salaire_net', $result);
        $this->assertArrayHasKey('cnss_employe', $result);
        $this->assertArrayHasKey('impot_mensuel', $result);
    }

    /** @test */
    public function it_generates_payroll_for_employee(): void
    {
        $employee = $this->createTestUser(['salaire_base' => 2000]);

        $result = $this->service->generer(
            $employee->id,
            Carbon::parse('2026-01-01'),
            Carbon::parse('2026-01-31')
        );

        $this->assertInstanceOf(Paie::class, $result);
        $this->assertEquals(StatutPaie::GENERE, $result->statut);
    }

    /** @test */
    public function it_prevents_duplicate_payroll_for_same_period(): void
    {
        $employee = $this->createTestUser(['salaire_base' => 2000]);
        $start = Carbon::parse('2026-02-01');
        $end = Carbon::parse('2026-02-28');

        $this->service->generer($employee->id, $start, $end);
        $result = $this->service->generer($employee->id, $start, $end);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('error', $result);
    }

    /** @test */
    public function it_dispatches_salary_paid_event_when_marked_paid(): void
    {
        Event::fake([SalaryPaid::class]);

        $employee = $this->createTestUser();
        $paie = $this->createTestPaie($employee, ['statut' => StatutPaie::GENERE]);

        $this->actingAs($this->createTestRh());
        $this->service->marquerPayee($paie->id);

        Event::assertDispatched(SalaryPaid::class, fn (SalaryPaid $event) => $event->userId === $employee->id);
    }
}
