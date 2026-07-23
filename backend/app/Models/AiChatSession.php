<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiChatSession extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'context_type',
    ];

    public function user()
    {
        return $this->belongsTo(Utilisateur::class, 'user_id');
    }

    public function messages()
    {
        return $this->hasMany(AiChatMessage::class, 'session_id')->orderBy('created_at');
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByContext($query, $contextType)
    {
        return $query->where('context_type', $contextType);
    }
}
