<?php

namespace App\Console\Commands;

use App\Events\PredictedAbsenceAlert;
use App\Services\AIService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class CheckAbsenceRisks extends Command
{
    protected $signature = 'ai:check-absence-risks';

    protected $description = 'Check AI attendance predictions and notify RH of likely upcoming absences.';

    private const ALERT_HORIZON_BUSINESS_DAYS = 3;

    private const CACHE_TTL_SECONDS = 86400;

    public function handle(AIService $aiService): int
    {
        $this->info('Checking AI absence risk predictions...');

        $predictions = $aiService->getAttendancePredictionsAll();
        if (isset($predictions['error'])) {
            $this->error('AI service unavailable: '.($predictions['message'] ?? 'unknown error'));

            return self::FAILURE;
        }

        if (! is_array($predictions)) {
            $this->warn('No predictions returned.');

            return self::SUCCESS;
        }

        $today = Carbon::today();
        $horizonEnd = $this->addBusinessDays($today->copy(), self::ALERT_HORIZON_BUSINESS_DAYS);
        $alertsSent = 0;

        foreach ($predictions as $employee) {
            $alertDates = $employee['alert_dates'] ?? [];
            if (empty($alertDates)) {
                continue;
            }

            $userId = (int) ($employee['utilisateur_id'] ?? 0);
            $name = trim(($employee['prenom'] ?? '').' '.($employee['nom'] ?? ''));

            foreach ($alertDates as $alert) {
                $alertDate = Carbon::parse($alert['date'] ?? '')->startOfDay();
                if ($alertDate->lt($today) || $alertDate->gt($horizonEnd)) {
                    continue;
                }

                $cacheKey = "absence_alert:{$userId}:{$alertDate->format('Y-m-d')}";
                if (Cache::has($cacheKey)) {
                    continue;
                }

                $dayLabel = $alert['day_name_fr'] ?? $alert['day_name'] ?? $alertDate->locale('fr')->dayName;
                $reason = $alert['reason'] ?? 'Risque d\'absence détecté';
                $probPct = isset($alert['absence_probability'])
                    ? (int) round((float) $alert['absence_probability'] * 100)
                    : null;

                $message = $probPct !== null
                    ? "{$name} risque d'être absent le {$dayLabel} ({$probPct}%) — {$reason}"
                    : "{$name} risque d'être absent le {$dayLabel} — {$reason}";

                event(new PredictedAbsenceAlert(
                    'Alerte absence prévue',
                    $message,
                    [
                        'utilisateur_id' => $userId,
                        'employee_name' => $name,
                        'date' => $alertDate->format('Y-m-d'),
                        'day_name' => $dayLabel,
                        'reason' => $reason,
                        'absence_probability' => $alert['absence_probability'] ?? null,
                        'recommendation' => $employee['recommendation'] ?? null,
                    ]
                ));

                Cache::put($cacheKey, true, self::CACHE_TTL_SECONDS);
                $alertsSent++;
            }
        }

        $this->info("Sent {$alertsSent} predicted absence alert(s).");

        return self::SUCCESS;
    }

    private function addBusinessDays(Carbon $date, int $businessDays): Carbon
    {
        $added = 0;
        while ($added < $businessDays) {
            $date->addDay();
            if (! $date->isWeekend()) {
                $added++;
            }
        }

        return $date;
    }
}
