<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $keyType = 'uuid';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'actor_id',
        'action',
        'entity_type',
        'entity_id',
        'details_json',
    ];

    protected $casts = [
        'details_json' => 'array',
    ];

    public function actor()
    {
        return $this->belongsTo(Utilisateur::class, 'actor_id');
    }

    public function scopeByAction($query, $action)
    {
        return $query->where('action', $action);
    }

    public function scopeByEntity($query, $entityType, $entityId)
    {
        return $query->where('entity_type', $entityType)
            ->where('entity_id', $entityId);
    }

    public function scopeByActor($query, $actorId)
    {
        return $query->where('actor_id', $actorId);
    }

    public function aiChatMessage()
    {
        return $this->belongsTo(AiChatMessage::class, 'source_ai_chat_message_id');
    }
}
