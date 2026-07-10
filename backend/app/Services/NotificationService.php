<?php

namespace App\Services;

use App\Contracts\Services\NotificationServiceInterface;
use App\Events\FeedbackCreated;
use App\Events\FeedbackDeleted;
use App\Events\FeedbackUpdated;
use Illuminate\Support\Facades\Event;

class NotificationService implements NotificationServiceInterface
{
    public function notifyFeedbackCreated(int $employeeId, int $chefId, float $score, string $message): void
    {
        // Notify employee about new feedback
        Event::dispatch(new FeedbackCreated($employeeId, $chefId, $score, $message));
    }

    public function notifyFeedbackUpdated(int $employeeId, int $chefId, float $score): void
    {
        // Notify employee about feedback update
        Event::dispatch(new FeedbackUpdated($employeeId, $chefId, $score));
    }

    public function notifyFeedbackDeleted(int $employeeId, int $chefId): void
    {
        // Notify relevant parties about feedback deletion
        Event::dispatch(new FeedbackDeleted($employeeId, $chefId));
    }

    public function notifyHRAboutFeedback(int $employeeId, int $chefId, float $score, string $employeeName, string $chefName): void
    {
        // This will be handled within the FeedbackCreated event
        // The event will broadcast to HR channel with appropriate type
        $type = $score >= 7.0 ? 'success' : 'warning';
        
        // The FeedbackCreated event already handles HR notification
        // This method is kept for future extensibility
    }
}
