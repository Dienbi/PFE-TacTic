<?php

namespace Tests\Unit\Services;

use App\Events\AttendanceNotification;
use App\Services\PointageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use Tests\TestHelpers;

class PointageServiceTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    private PointageService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PointageService::class);
    }

    /** @test */
    public function it_detects_late_check_in_after_threshold(): void
    {
        Carbon::setTestNow(Carbon::today()->setTime(9, 30));
        Event::fake([AttendanceNotification::class]);

        $employee = $this->createTestUser();
        $this->service->pointerEntree($employee->id);

        Event::assertDispatched(AttendanceNotification::class, function (AttendanceNotification $event) {
            return $event->type === 'warning' && ($event->data['is_late'] ?? false) === true;
        });

        Carbon::setTestNow();
    }

    /** @test */
    public function it_prevents_double_clock_in_same_day(): void
    {
        $employee = $this->createTestUser();
        $this->service->pointerEntree($employee->id);

        $this->expectException(ValidationException::class);
        $this->service->pointerEntree($employee->id);
    }

    /** @test */
    public function it_prevents_clock_out_without_clock_in(): void
    {
        $employee = $this->createTestUser();

        $this->expectException(ValidationException::class);
        $this->service->pointerSortie($employee->id);
    }

    /** @test */
    public function it_builds_attendance_summary_lists(): void
    {
        $employee = $this->createTestUser();
        Carbon::setTestNow(Carbon::today()->setTime(8, 0));
        $this->service->pointerEntree($employee->id);
        Carbon::setTestNow();

        $summary = $this->service->getSummary(Carbon::today());

        $this->assertArrayHasKey('stats', $summary);
        $this->assertArrayHasKey('lists', $summary);
        $this->assertArrayHasKey('present', $summary['lists']);
        $this->assertArrayHasKey('late', $summary['lists']);
        $this->assertArrayHasKey('absent', $summary['lists']);
    }
}
