<?php

namespace Tests\Unit\Services;

use App\Events\AttendanceNotification;
use App\Events\LeaveStatusNotification;
use App\Events\SalaryPaid;
use App\Models\Utilisateur;
use Tests\TestCase;

class EventDispatchTest extends TestCase
{
    /** @test */
    public function leave_status_notification_carries_expected_payload(): void
    {
        $event = new LeaveStatusNotification(
            42,
            'success',
            'Leave Approved',
            'Your leave has been approved.',
            ['conge_id' => 7]
        );

        $this->assertSame(42, $event->userId);
        $this->assertSame('success', $event->type);
        $this->assertSame(7, $event->data['conge_id']);
        $this->assertSame('LeaveStatusNotification', $event->broadcastAs());
    }

    /** @test */
    public function salary_paid_event_formats_message(): void
    {
        $user = Utilisateur::factory()->make(['id' => 5]);
        $event = new SalaryPaid($user, 1500.50);

        $this->assertSame(5, $event->userId);
        $this->assertSame(1500.50, $event->salaireNet);
        $this->assertStringContainsString('TND', $event->message);
        $this->assertSame('SalaryPaid', $event->broadcastAs());
    }

    /** @test */
    public function attendance_notification_includes_late_flag(): void
    {
        $event = new AttendanceNotification(
            'warning',
            'Late Check-in',
            'Employee checked in late',
            ['user_id' => 3, 'is_late' => true, 'action' => 'check_in']
        );

        $this->assertSame('warning', $event->type);
        $this->assertTrue($event->data['is_late']);
        $this->assertSame('AttendanceNotification', $event->broadcastAs());
    }
}
