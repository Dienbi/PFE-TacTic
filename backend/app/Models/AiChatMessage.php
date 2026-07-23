<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiChatMessage extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'id',
        'session_id',
        'role',
        'content',
        'proposed_action_json',
        'created_at',
    ];

    protected $casts = [
        'proposed_action_json' => 'array',
        'created_at' => 'datetime',
    ];

    public function session()
    {
        return $this->belongsTo(AiChatSession::class, 'session_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'source_ai_chat_message_id');
    }

    public function scopeFromUser($query)
    {
        return $query->where('role', 'user');
    }

    public function scopeFromAi($query)
    {
        return $query->where('role', 'ai');
    }

    public function scopeWithProposal($query)
    {
        return $query->whereNotNull('proposed_action_json');
    }
}
