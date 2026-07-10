<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FeedbackDeleted implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public int $employeeId,
        public int $chefId
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('user.' . $this->employeeId);
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'info',
            'title' => 'Feedback Supprimé',
            'message' => 'Un feedback a été supprimé par votre manager.',
            'data' => [
                'employee_id' => $this->employeeId,
                'chef_id' => $this->chefId,
            ],
            'timestamp' => now()->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'FeedbackDeleted';
    }
}
