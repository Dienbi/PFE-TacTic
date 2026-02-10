<?php

namespace App\Events;

use App\Models\Paie;
use App\Models\Utilisateur;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SalaryPaid implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $salaireNet;
    public $userId;
    public $type;

    /**
     * Create a new event instance.
     */
    public function __construct(Utilisateur $user, float $salaireNet)
    {
        $this->userId = $user->id;
        $this->salaireNet = $salaireNet;
        $this->message = "Votre salaire de " . number_format($salaireNet, 3) . " TND a été versé.";
        $this->type = 'success';
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->userId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'SalaryPaid';
    }
}
