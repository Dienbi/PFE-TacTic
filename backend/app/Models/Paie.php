<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Paie extends Model
{
    use HasFactory;

    protected $table = 'paies';

    protected $fillable = [
        'utilisateur_id',
        'periode_debut',
        'periode_fin',
        'salaire_brut',
        'deductions',
        'heures_supp',
        'salaire_net',
        'date_paiement',
    ];

    protected $casts = [
        'periode_debut' => 'date',
        'periode_fin' => 'date',
        'date_paiement' => 'date',
        'salaire_brut' => 'decimal:2',
        'deductions' => 'decimal:2',
        'heures_supp' => 'decimal:2',
        'salaire_net' => 'decimal:2',
    ];

    // Relationships
    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }

    // Scopes
    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('periode_debut', [$startDate, $endDate]);
    }

    public function scopePaye($query)
    {
        return $query->whereNotNull('date_paiement');
    }

    public function scopeNonPaye($query)
    {
        return $query->whereNull('date_paiement');
    }

    // Helper methods
    public function calculerSalaireNet()
    {
        $this->salaire_net = $this->salaire_brut - $this->deductions + ($this->heures_supp * 25); // 25€/h supp
        $this->save();
        return $this->salaire_net;
    }

    public function isPaye(): bool
    {
        return $this->date_paiement !== null;
    }
}
