<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pointage extends Model
{
    use HasFactory;

    protected $table = 'pointages';

    protected $fillable = [
        'utilisateur_id',
        'date',
        'heure_entree',
        'heure_sortie',
        'duree_travail',
        'absence_justifiee',
    ];

    protected $casts = [
        'date' => 'date',
        'heure_entree' => 'datetime:H:i',
        'heure_sortie' => 'datetime:H:i',
        'duree_travail' => 'decimal:2',
        'absence_justifiee' => 'boolean',
    ];

    // Relationships
    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }

    // Scopes
    public function scopeByDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    public function scopeAbsences($query)
    {
        return $query->whereNull('heure_entree');
    }

    public function scopePresences($query)
    {
        return $query->whereNotNull('heure_entree');
    }

    // Helper methods
    public function calculerDureeTravail()
    {
        if ($this->heure_entree && $this->heure_sortie) {
            $entree = \Carbon\Carbon::parse($this->heure_entree);
            $sortie = \Carbon\Carbon::parse($this->heure_sortie);
            $this->duree_travail = $sortie->diffInHours($entree, true);
            $this->save();
        }
        return $this->duree_travail;
    }
}
