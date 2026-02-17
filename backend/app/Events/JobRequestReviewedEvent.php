<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JobRequestReviewedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $userId,
        public int $jobRequestId,
        public string $titre,
        public bool $approved,
        public ?string $raison = null
    ) {}

    public function broadcastOn(): Channel
    {
        // Private channel for the manager who made the request
        return new PrivateChannel('user.' . $this->userId);
    }

    public function broadcastWith(): array
    {
        $message = $this->approved
            ? "Votre demande de poste '{$this->titre}' a été approuvée."
            : "Votre demande de poste '{$this->titre}' a été rejetée.";

        if (!$this->approved && $this->raison) {
            $message .= " Raison: {$this->raison}";
        }

        return [
            'type' => $this->approved ? 'success' : 'warning',
            'job_request_id' => $this->jobRequestId,
            'titre' => $this->titre,
            'approved' => $this->approved,
            'raison' => $this->raison,
            'message' => $message,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'JobRequestReviewed';
    }
}
