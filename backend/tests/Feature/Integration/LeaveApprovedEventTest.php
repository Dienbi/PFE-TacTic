<?php

namespace Tests\Feature\Integration;

use App\Enums\StatutConge;
use App\Enums\TypeConge;
use App\Events\LeaveStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class LeaveApprovedEventTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function leave_approved_event_is_dispatched_when_rh_approves(): void
    {
        Event::fake([LeaveStatusNotification::class]);

        $rh = $this->createTestRh();
        $employee = $this->createTestUser(['solde_conge' => 20]);
        $conge = $this->createTestConge($employee, [
            'type' => TypeConge::ANNUEL,
            'date_debut' => Carbon::tomorrow(),
            'date_fin' => Carbon::tomorrow()->addDays(2),
            'statut' => StatutConge::EN_ATTENTE,
        ]);

        $this
            ->actingAsApiUser($rh)
            ->postJson("/api/conges/{$conge->id}/approuver")
            ->assertOk();

        Event::assertDispatched(LeaveStatusNotification::class, function (LeaveStatusNotification $event) use ($employee, $conge) {
            return $event->userId === $employee->id
                && $event->type === 'success'
                && ($event->data['conge_id'] ?? null) === $conge->id;
        });
    }
}
