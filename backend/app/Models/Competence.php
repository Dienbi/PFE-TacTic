<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Competence extends Model
{
    use HasFactory;

    protected $table = 'competences';

    protected $fillable = [
        'nom',
        'niveau',
    ];

    protected $casts = [
        'niveau' => 'integer',
    ];

    // Relationships
    public function utilisateurs()
    {
        return $this->belongsToMany(Utilisateur::class, 'utilisateur_competence')
            ->withPivot('niveau')
            ->withTimestamps();
    }
}
