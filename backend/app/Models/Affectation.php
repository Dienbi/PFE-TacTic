<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Affectation extends Model
{
    use HasFactory;

    protected $table = 'affectations';

    protected $fillable = [
        'utilisateur_id',
        'poste_id',
        'date_debut',
        'date_fin',
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
    ];

    // Relationships
    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }

    public function poste()
    {
        return $this->belongsTo(Poste::class);
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('date_fin')
                ->orWhere('date_fin', '>=', now());
        });
    }

    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('date_debut', [$startDate, $endDate])
                ->orWhereBetween('date_fin', [$startDate, $endDate]);
        });
    }

    // Helper methods
    public function isActif(): bool
    {
        return $this->date_fin === null || $this->date_fin >= now();
    }
}
