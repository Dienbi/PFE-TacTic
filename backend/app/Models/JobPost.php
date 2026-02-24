<?php

namespace App\Models;

use App\Enums\JobPostStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobPost extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'job_posts';

    protected $fillable = [
        'job_request_id',
        'titre',
        'description',
        'statut',
        'published_at',
        'closed_at',
        'created_by',
    ];

    protected $casts = [
        'statut' => JobPostStatus::class,
        'published_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    // Relationships
    public function jobRequest()
    {
        return $this->belongsTo(JobRequest::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(Utilisateur::class, 'created_by');
    }

    public function competences()
    {
        return $this->belongsToMany(Competence::class, 'job_post_competence')
                    ->withPivot('niveau_requis')
                    ->withTimestamps();
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }

    // Scopes
    public function scopeDraft($query)
    {
        return $query->where('statut', JobPostStatus::DRAFT);
    }

    public function scopePublished($query)
    {
        return $query->where('statut', JobPostStatus::PUBLISHED)
                     ->whereNotNull('published_at');
    }

    public function scopeClosed($query)
    {
        return $query->where('statut', JobPostStatus::CLOSED);
    }

    public function scopeOpen($query)
    {
        return $query->where('statut', JobPostStatus::PUBLISHED)
                     ->whereNull('closed_at');
    }

    // Helper Methods
    public function isDraft(): bool
    {
        return $this->statut === JobPostStatus::DRAFT;
    }

    public function isPublished(): bool
    {
        return $this->statut === JobPostStatus::PUBLISHED;
    }

    public function isClosed(): bool
    {
        return $this->statut === JobPostStatus::CLOSED;
    }

    public function publish(): bool
    {
        $this->statut = JobPostStatus::PUBLISHED;
        $this->published_at = now();
        return $this->save();
    }

    public function close(): bool
    {
        $this->statut = JobPostStatus::CLOSED;
        $this->closed_at = now();
        return $this->save();
    }

    public function getApplicationsCountAttribute(): int
    {
        return $this->applications_count ?? $this->applications()->count();
    }

    public function getPendingApplicationsCountAttribute(): int
    {
        return $this->pending_applications_count ?? $this->applications()->pending()->count();
    }
}
