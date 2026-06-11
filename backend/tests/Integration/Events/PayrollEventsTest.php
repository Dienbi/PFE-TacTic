<?php

namespace Tests\Integration\Events;

use App\Enums\StatutPaie;
use App\Events\SalaryPaid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class PayrollEventsTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function marking_payroll_paid_dispatches_salary_paid_event(): void
    {
        Event::fake([SalaryPaid::class]);

        $rh = $this->createTestRh();
        $employee = $this->createTestUser();
        $paie = $this->createTestPaie($employee, ['statut' => StatutPaie::GENERE]);

        $this->actingAsApiUser($rh)->postJson("/api/paies/{$paie->id}/payer")->assertOk();

        Event::assertDispatched(SalaryPaid::class);
    }
}
