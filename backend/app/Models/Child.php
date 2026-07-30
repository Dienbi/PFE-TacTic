<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Child extends Model
{
    use HasFactory;

    protected $fillable = [
        'utilisateur_id',
        'nom',
        'prenom',
        'date_naissance',
        'status',
        'document_path',
        'verified',
        'verified_at',
        'rejected',
        'rejected_at',
        'rejection_reason',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'verified' => 'boolean',
        'verified_at' => 'datetime',
        'rejected' => 'boolean',
        'rejected_at' => 'datetime',
    ];

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }
}
