<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Poste extends Model
{
    use HasFactory;

    protected $table = 'postes';

    protected $fillable = [
        'titre',
        'statut',
        'description',
    ];

    // Relationships
    public function affectations()
    {
        return $this->hasMany(Affectation::class);
    }

    public function utilisateurs()
    {
        return $this->hasManyThrough(
            Utilisateur::class,
            Affectation::class,
            'poste_id',
            'id',
            'id',
            'utilisateur_id'
        );
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->where('statut', 'ACTIF');
    }
}
