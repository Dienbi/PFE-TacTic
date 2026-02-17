<?php

namespace App\Models;

use App\Enums\JobRequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobRequest extends Model
{
    use HasFactory;

    protected $table = 'job_requests';

    protected $fillable = [
        'titre',
        'description',
        'equipe_id',
        'demandeur_id',
        'statut',
        'raison_rejet',
    ];

    protected $casts = [
        'statut' => JobRequestStatus::class,
    ];

    // Relationships
    public function demandeur()
    {
        return $this->belongsTo(Utilisateur::class, 'demandeur_id');
    }

    public function equipe()
    {
        return $this->belongsTo(Equipe::class);
    }

    public function jobPost()
    {
        return $this->hasOne(JobPost::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('statut', JobRequestStatus::PENDING);
    }

    public function scopeApproved($query)
    {
        return $query->where('statut', JobRequestStatus::APPROVED);
    }

    public function scopeRejected($query)
    {
        return $query->where('statut', JobRequestStatus::REJECTED);
    }

    public function scopeForDemandeur($query, $userId)
    {
        return $query->where('demandeur_id', $userId);
    }

    public function scopeForEquipe($query, $equipeId)
    {
        return $query->where('equipe_id', $equipeId);
    }

    // Helper Methods
    public function isPending(): bool
    {
        return $this->statut === JobRequestStatus::PENDING;
    }

    public function isApproved(): bool
    {
        return $this->statut === JobRequestStatus::APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->statut === JobRequestStatus::REJECTED;
    }

    public function approve(): bool
    {
        $this->statut = JobRequestStatus::APPROVED;
        $this->raison_rejet = null;
        return $this->save();
    }

    public function reject(string $raison): bool
    {
        $this->statut = JobRequestStatus::REJECTED;
        $this->raison_rejet = $raison;
        return $this->save();
    }
}
