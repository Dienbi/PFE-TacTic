<?php

namespace Tests\Integration\Events;

use App\Enums\Role;
use App\Events\AttendanceNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class AttendanceEventsTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function late_check_in_dispatches_attendance_notification(): void
    {
        Carbon::setTestNow(Carbon::today()->setTime(9, 30));
        Event::fake([AttendanceNotification::class]);

        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this->actingAsApiUser($employee)->postJson('/api/pointages/entree')->assertOk();

        Event::assertDispatched(AttendanceNotification::class);

        Carbon::setTestNow();
    }
}
