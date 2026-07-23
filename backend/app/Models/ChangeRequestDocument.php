<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChangeRequestDocument extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'change_request_id',
        'document_type',
        'file_path',
        'uploaded_at',
        'verified_by_hr',
        'verified_by',
        'verification_notes',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
        'verified_by_hr' => 'boolean',
    ];

    public function changeRequest()
    {
        return $this->belongsTo(PersonalInfoChangeRequest::class, 'change_request_id');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(Utilisateur::class, 'verified_by');
    }

    public function scopeVerified($query)
    {
        return $query->where('verified_by_hr', true);
    }

    public function scopeUnverified($query)
    {
        return $query->where('verified_by_hr', false);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('document_type', $type);
    }
}
