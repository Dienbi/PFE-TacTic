<?php

namespace App\Contracts\Services;

interface NotificationServiceInterface
{
    public function notifyFeedbackCreated(int $employeeId, int $chefId, float $score, string $message): void;
    public function notifyFeedbackUpdated(int $employeeId, int $chefId, float $score): void;
    public function notifyFeedbackDeleted(int $employeeId, int $chefId): void;
    public function notifyHRAboutFeedback(int $employeeId, int $chefId, float $score, string $employeeName, string $chefName): void;
}
