<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PredictedAbsenceAlert implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public string $type = 'predicted_absence';

    public string $title;

    public string $message;

    public string $timestamp;

    public ?array $data;

    public function __construct(
        string $title,
        string $message,
        ?array $data = null
    ) {
        $this->title = $title;
        $this->message = $message;
        $this->timestamp = now()->toIso8601String();
        $this->data = $data;
    }

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('rh.attendance'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'PredictedAbsenceAlert';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'timestamp' => $this->timestamp,
            'data' => $this->data,
        ];
    }
}
