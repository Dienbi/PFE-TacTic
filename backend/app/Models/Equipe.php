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
    public function getNombreMembresAttribute()
    {
        return $this->membres()->count();
    }
}
