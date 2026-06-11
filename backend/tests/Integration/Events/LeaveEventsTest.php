<?php

namespace Tests\Integration\Events;

use App\Enums\StatutConge;
use App\Enums\TypeConge;
use App\Events\LeaveStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class LeaveEventsTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function approving_leave_dispatches_leave_status_notification(): void
    {
        Event::fake([LeaveStatusNotification::class]);

        $rh = $this->createTestRh();
        $employee = $this->createTestUser(['solde_conge' => 20]);
        $conge = $this->createTestConge($employee, [
            'type' => TypeConge::ANNUEL,
            'statut' => StatutConge::EN_ATTENTE,
        ]);

        $this->actingAsApiUser($rh)->postJson("/api/conges/{$conge->id}/approuver")->assertOk();

        Event::assertDispatched(LeaveStatusNotification::class);
    }

    /** @test */
    public function rejecting_leave_dispatches_leave_status_notification(): void
    {
        Event::fake([LeaveStatusNotification::class]);

        $rh = $this->createTestRh();
        $conge = $this->createTestConge($this->createTestUser(), ['statut' => StatutConge::EN_ATTENTE]);

        $this->actingAsApiUser($rh)->postJson("/api/conges/{$conge->id}/refuser", ['motif' => 'No'])->assertOk();

        Event::assertDispatched(LeaveStatusNotification::class);
    }
}
