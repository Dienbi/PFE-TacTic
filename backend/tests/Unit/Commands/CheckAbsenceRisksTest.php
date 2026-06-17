<?php

namespace Tests\Unit\Commands;

use App\Events\PredictedAbsenceAlert;
use App\Services\AIService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Mockery;
use Tests\TestCase;

class CheckAbsenceRisksTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_dispatches_predicted_absence_alert_for_upcoming_risk_dates(): void
    {
        Event::fake([PredictedAbsenceAlert::class]);
        Cache::flush();

        $tomorrow = now()->addWeekday()->format('Y-m-d');

        $mock = Mockery::mock(AIService::class);
        $mock->shouldReceive('getAttendancePredictionsAll')->once()->andReturn([
            [
                'utilisateur_id' => 42,
                'nom' => 'Dupont',
                'prenom' => 'Jean',
                'alert_dates' => [
                    [
                        'date' => $tomorrow,
                        'day_name' => 'Thursday',
                        'day_name_fr' => 'jeudi',
                        'absence_probability' => 0.62,
                        'reason' => 'Absent régulièrement le jeudi',
                    ],
                ],
                'recommendation' => 'Contacter l\'employé avant le jeudi.',
            ],
        ]);
        $this->app->instance(AIService::class, $mock);

        $exitCode = Artisan::call('ai:check-absence-risks');

        $this->assertSame(0, $exitCode);
        Event::assertDispatched(PredictedAbsenceAlert::class, function (PredictedAbsenceAlert $event) {
            return $event->type === 'predicted_absence'
                && str_contains($event->message, 'Jean Dupont');
        });
    }

    /** @test */
    public function it_deduplicates_alerts_within_24_hours(): void
    {
        Event::fake([PredictedAbsenceAlert::class]);
        Cache::flush();

        $tomorrow = now()->addWeekday()->format('Y-m-d');
        $predictions = [
            [
                'utilisateur_id' => 7,
                'nom' => 'Martin',
                'prenom' => 'Alice',
                'alert_dates' => [
                    [
                        'date' => $tomorrow,
                        'day_name_fr' => 'vendredi',
                        'absence_probability' => 0.7,
                        'reason' => 'Risque élevé',
                    ],
                ],
            ],
        ];

        $mock = Mockery::mock(AIService::class);
        $mock->shouldReceive('getAttendancePredictionsAll')->twice()->andReturn($predictions);
        $this->app->instance(AIService::class, $mock);

        Artisan::call('ai:check-absence-risks');
        Artisan::call('ai:check-absence-risks');

        Event::assertDispatchedTimes(PredictedAbsenceAlert::class, 1);
    }

    /** @test */
    public function it_returns_failure_when_ai_service_is_unavailable(): void
    {
        Event::fake([PredictedAbsenceAlert::class]);

        $mock = Mockery::mock(AIService::class);
        $mock->shouldReceive('getAttendancePredictionsAll')->once()->andReturn([
            'error' => true,
            'message' => 'AI service is not available',
        ]);
        $this->app->instance(AIService::class, $mock);

        $exitCode = Artisan::call('ai:check-absence-risks');

        $this->assertSame(1, $exitCode);
        Event::assertNotDispatched(PredictedAbsenceAlert::class);
    }
}
