<?php

namespace Tests\Feature\Integration;

use App\Enums\Role;
use App\Events\AttendanceNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class AttendanceAnomalyDetectedEventTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function attendance_notification_is_dispatched_on_late_check_in(): void
    {
        Carbon::setTestNow(Carbon::today()->setTime(9, 30));
        Event::fake([AttendanceNotification::class]);

        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/pointages/entree')
            ->assertOk();

        Event::assertDispatched(AttendanceNotification::class, function (AttendanceNotification $event) use ($employee) {
            return $event->type === 'warning'
                && ($event->data['user_id'] ?? null) === $employee->id
                && ($event->data['is_late'] ?? false) === true;
        });

        Carbon::setTestNow();
    }
}
