<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewAccountRequest implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $accountRequest;

    /**
     * Create a new event instance.
     */
    public function __construct(array $accountRequest)
    {
        $this->accountRequest = $accountRequest;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('rh-notifications'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'new-account-request';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'type' => 'NEW_ACCOUNT_REQUEST',
            'data' => $this->accountRequest,
            'message' => "Nouvelle demande de compte de {$this->accountRequest['prenom']} {$this->accountRequest['nom']}",
            'timestamp' => now()->toISOString(),
        ];
    }
}
