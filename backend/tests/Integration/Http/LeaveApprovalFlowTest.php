<?php

namespace Tests\Integration\Http;

use App\Enums\EmployeStatus;
use App\Enums\StatutConge;
use App\Events\LeaveStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class LeaveApprovalFlowTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function leave_approval_updates_employee_state_and_dispatches_event(): void
    {
        Event::fake([LeaveStatusNotification::class]);

        $rh = $this->createTestRh();
        $employee = $this->createTestUser(['solde_conge' => 20]);
        $conge = $this->createTestConge($employee, ['statut' => StatutConge::EN_ATTENTE]);

        $this->actingAsApiUser($rh)->postJson("/api/conges/{$conge->id}/approuver")->assertOk();

        $this->assertDatabaseHas('conges', [
            'id' => $conge->id,
            'statut' => StatutConge::APPROUVE->value,
            'approuve_par' => $rh->id,
        ]);

        $this->assertDatabaseHas('utilisateurs', [
            'id' => $employee->id,
            'status' => EmployeStatus::EN_CONGE->value,
        ]);

        Event::assertDispatched(LeaveStatusNotification::class);
    }
}
