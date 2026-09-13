<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FeedbackCreated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public int $employeeId,
        public int $chefId,
        public float $score,
        public string $message
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->employeeId),
            new PrivateChannel('hr'), // HR channel for score notifications
        ];
    }

    public function broadcastWith(): array
    {
        $type = $this->score >= 7.0 ? 'success' : 'warning';

        return [
            'type' => $type,
            'title' => 'Nouveau Feedback',
            'message' => $this->message,
            'data' => [
                'employee_id' => $this->employeeId,
                'chef_id' => $this->chefId,
                'score' => $this->score,
            ],
            'timestamp' => now()->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'FeedbackCreated';
    }
}
