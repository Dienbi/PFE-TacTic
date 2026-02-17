<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    use HasFactory;

    protected $table = 'job_applications';

    protected $fillable = [
        'job_post_id',
        'utilisateur_id',
        'statut',
        'motivation',
        'applied_at',
        'reviewed_at',
        'reviewed_by',
    ];

    protected $casts = [
        'statut' => ApplicationStatus::class,
        'applied_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    // Relationships
    public function jobPost()
    {
        return $this->belongsTo(JobPost::class);
    }

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(Utilisateur::class, 'reviewed_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('statut', ApplicationStatus::PENDING);
    }

    public function scopeReviewed($query)
    {
        return $query->where('statut', ApplicationStatus::REVIEWED);
    }

    public function scopeAccepted($query)
    {
        return $query->where('statut', ApplicationStatus::ACCEPTED);
    }

    public function scopeRejected($query)
    {
        return $query->where('statut', ApplicationStatus::REJECTED);
    }

    public function scopeWithdrawn($query)
    {
        return $query->where('statut', ApplicationStatus::WITHDRAWN);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('utilisateur_id', $userId);
    }

    public function scopeForJobPost($query, $jobPostId)
    {
        return $query->where('job_post_id', $jobPostId);
    }

    // Helper Methods
    public function isPending(): bool
    {
        return $this->statut === ApplicationStatus::PENDING;
    }

    public function isReviewed(): bool
    {
        return $this->statut === ApplicationStatus::REVIEWED;
    }

    public function isAccepted(): bool
    {
        return $this->statut === ApplicationStatus::ACCEPTED;
    }

    public function isRejected(): bool
    {
        return $this->statut === ApplicationStatus::REJECTED;
    }

    public function isWithdrawn(): bool
    {
        return $this->statut === ApplicationStatus::WITHDRAWN;
    }

    public function canWithdraw(): bool
    {
        return $this->isPending();
    }

    public function withdraw(): bool
    {
        if (!$this->canWithdraw()) {
            return false;
        }

        $this->statut = ApplicationStatus::WITHDRAWN;
        return $this->save();
    }

    public function markAsReviewed($reviewerId): bool
    {
        $this->statut = ApplicationStatus::REVIEWED;
        $this->reviewed_at = now();
        $this->reviewed_by = $reviewerId;
        return $this->save();
    }

    public function accept($reviewerId): bool
    {
        $this->statut = ApplicationStatus::ACCEPTED;
        $this->reviewed_at = now();
        $this->reviewed_by = $reviewerId;
        return $this->save();
    }

    public function reject($reviewerId): bool
    {
        $this->statut = ApplicationStatus::REJECTED;
        $this->reviewed_at = now();
        $this->reviewed_by = $reviewerId;
        return $this->save();
    }
}
