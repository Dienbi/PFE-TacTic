<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewJobPostEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $jobPostId,
        public string $titre,
        public string $description
    ) {}

    public function broadcastOn(): Channel
    {
        // Public channel for all employees
        return new Channel('job-posts');
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'new_job_post',
            'job_post_id' => $this->jobPostId,
            'titre' => $this->titre,
            'description' => $this->description,
            'message' => "Nouveau poste disponible: {$this->titre}",
            'timestamp' => now()->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'NewJobPost';
    }
}
