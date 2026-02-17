<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewApplicationEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $applicationId,
        public int $jobPostId,
        public string $jobPostTitre,
        public string $candidatNom,
        public string $candidatMatricule
    ) {}

    public function broadcastOn(): Channel
    {
        // Broadcast to HR notifications channel
        return new Channel('rh-notifications');
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'new_application',
            'application_id' => $this->applicationId,
            'job_post_id' => $this->jobPostId,
            'job_post_titre' => $this->jobPostTitre,
            'candidat_nom' => $this->candidatNom,
            'candidat_matricule' => $this->candidatMatricule,
            'message' => "{$this->candidatNom} a postulé pour: {$this->jobPostTitre}",
            'timestamp' => now()->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'NewApplication';
    }
}
