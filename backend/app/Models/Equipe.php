<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Equipe extends Model
{
    use HasFactory;

    protected $table = 'equipes';

    protected $fillable = [
        'nom',
        'chef_equipe_id',
    ];

    // Relationships
    public function chefEquipe()
    {
        return $this->belongsTo(Utilisateur::class, 'chef_equipe_id');
    }

    public function membres()
    {
        return $this->hasMany(Utilisateur::class, 'equipe_id');
    }

    // Accessors
    /**
     * Get nombre_membres attribute.
     * Prefer using ->loadCount('membres') or Equipe::withCount('membres') at the query level
     * to avoid N+1 queries when serializing collections.
     */
    public function getNombreMembresAttribute()
    {
        // Use the pre-loaded count if available (from withCount), otherwise fallback to query
        return $this->membres_count ?? $this->membres()->count();
    }
}
