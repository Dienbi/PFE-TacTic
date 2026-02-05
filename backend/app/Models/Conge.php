<?php

namespace App\Models;

use App\Enums\StatutConge;
use App\Enums\TypeConge;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conge extends Model
{
    use HasFactory;

    protected $table = 'conges';

    protected $fillable = [
        'utilisateur_id',
        'type',
        'date_debut',
        'date_fin',
        'statut',
        'motif',
        'approuve_par',
        'medical_file',
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
        'type' => TypeConge::class,
        'statut' => StatutConge::class,
    ];

    // Relationships
    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }

    public function approbateur()
    {
        return $this->belongsTo(Utilisateur::class, 'approuve_par');
    }

    // Accessors
    public function getNombreJoursAttribute()
    {
        return $this->date_debut->diffInDays($this->date_fin) + 1;
    }

    // Scopes
    public function scopeEnAttente($query)
    {
        return $query->where('statut', StatutConge::EN_ATTENTE);
    }

    public function scopeApprouve($query)
    {
        return $query->where('statut', StatutConge::APPROUVE);
    }

    public function scopeRefuse($query)
    {
        return $query->where('statut', StatutConge::REFUSE);
    }

    public function scopeByType($query, TypeConge $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('date_debut', [$startDate, $endDate])
                ->orWhereBetween('date_fin', [$startDate, $endDate]);
        });
    }

    // Helper methods
    public function isEnAttente(): bool
    {
        return $this->statut === StatutConge::EN_ATTENTE;
    }

    public function isApprouve(): bool
    {
        return $this->statut === StatutConge::APPROUVE;
    }

    public function isRefuse(): bool
    {
        return $this->statut === StatutConge::REFUSE;
    }
}
