<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewActivityLog implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public $log;

    /**
     * Create a new event instance.
     */
    public function __construct($log)
    {
        $this->log = $log;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('rh.notifications'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'NewActivityLog';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->log->id,
            'action' => $this->log->action,
            'description' => $this->log->description,
            'created_at' => $this->log->created_at->toISOString(),
            'user' => $this->log->user ? [
                'id' => $this->log->user->id,
                'nom' => $this->log->user->nom,
                'prenom' => $this->log->user->prenom,
                'role' => $this->log->user->role,
            ] : null,
        ];
    }
}
