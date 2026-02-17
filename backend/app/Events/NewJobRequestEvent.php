<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewJobRequestEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $jobRequestId,
        public string $titre,
        public string $demandeurNom,
        public string $equipeNom
    ) {}

    public function broadcastOn(): Channel
    {
        // Broadcast to HR notifications channel
        return new Channel('rh-notifications');
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'job_request',
            'job_request_id' => $this->jobRequestId,
            'titre' => $this->titre,
            'demandeur_nom' => $this->demandeurNom,
            'equipe_nom' => $this->equipeNom,
            'message' => "Nouvelle demande de poste: {$this->titre} par {$this->demandeurNom}",
            'timestamp' => now()->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'NewJobRequest';
    }
}
