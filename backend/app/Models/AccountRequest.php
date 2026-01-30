<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'prenom',
        'personal_email',
        'status',
        'rejection_reason',
        'generated_email',
        'temp_token',
        'token_expires_at',
        'token_used',
        'approved_by',
        'processed_at',
    ];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'processed_at' => 'datetime',
        'token_used' => 'boolean',
    ];

    // Status constants
    const STATUS_PENDING = 'PENDING';
    const STATUS_APPROVED = 'APPROVED';
    const STATUS_REJECTED = 'REJECTED';

    // Relationships
    public function approver()
    {
        return $this->belongsTo(Utilisateur::class, 'approved_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    // Helper methods
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isTokenValid(): bool
    {
        return $this->temp_token
            && !$this->token_used
            && $this->token_expires_at
            && $this->token_expires_at->isFuture();
    }

    public function generateEmail(): string
    {
        $firstName = strtolower($this->prenom);
        $lastName = strtolower($this->nom);
        // Remove accents and special characters
        $firstName = preg_replace('/[^a-z]/', '', iconv('UTF-8', 'ASCII//TRANSLIT', $firstName));
        $lastName = preg_replace('/[^a-z]/', '', iconv('UTF-8', 'ASCII//TRANSLIT', $lastName));

        return "{$firstName}.{$lastName}@tactic.com";
    }
}
