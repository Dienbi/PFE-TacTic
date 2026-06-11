<?php

namespace Tests\Feature\Integration;

use App\Enums\StatutPaie;
use App\Events\SalaryPaid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class PayrollGeneratedEventTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function salary_paid_event_is_dispatched_when_payroll_is_marked_paid(): void
    {
        Event::fake([SalaryPaid::class]);

        $rh = $this->createTestRh();
        $employee = $this->createTestUser(['salaire_base' => 2000]);
        $paie = $this->createTestPaie($employee, [
            'statut' => StatutPaie::GENERE,
            'salaire_net' => 1600.00,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->postJson("/api/paies/{$paie->id}/payer")
            ->assertOk();

        Event::assertDispatched(SalaryPaid::class, function (SalaryPaid $event) use ($employee) {
            return $event->userId === $employee->id;
        });
    }
}
