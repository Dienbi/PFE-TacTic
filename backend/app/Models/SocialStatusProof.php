<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SocialStatusProof extends Model
{
    use HasFactory;

    protected $fillable = [
        'utilisateur_id',
        'social_status',
        'document_path',
        'verified',
        'verified_at',
        'status',
        'rejection_reason',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class);
    }
}
