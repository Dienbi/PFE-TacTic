<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FeedbackUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public int $employeeId,
        public int $chefId,
        public float $score
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('user.' . $this->employeeId);
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'info',
            'title' => 'Feedback Mis à Jour',
            'message' => 'Votre feedback a été mis à jour par votre manager.',
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
        return 'FeedbackUpdated';
    }
}
