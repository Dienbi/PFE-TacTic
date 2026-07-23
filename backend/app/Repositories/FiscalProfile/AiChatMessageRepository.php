<?php

namespace App\Repositories\FiscalProfile;

use App\Models\AiChatMessage;
use Illuminate\Support\Str;

class AiChatMessageRepository
{
    public function create(array $data): AiChatMessage
    {
        return AiChatMessage::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            'session_id' => $data['session_id'],
            'role' => $data['role'],
            'content' => $data['content'],
            'proposed_action_json' => $data['proposed_action_json'] ?? null,
            'created_at' => $data['created_at'] ?? now(),
        ]);
    }

    public function findById(string $id): ?AiChatMessage
    {
        return AiChatMessage::with(['session', 'auditLogs'])->find($id);
    }

    public function findBySession(string $sessionId): \Illuminate\Database\Eloquent\Collection
    {
        return AiChatMessage::where('session_id', $sessionId)
            ->orderBy('created_at', 'asc')
            ->get();
    }

    public function findWithProposalBySession(string $sessionId): \Illuminate\Database\Eloquent\Collection
    {
        return AiChatMessage::where('session_id', $sessionId)
            ->whereNotNull('proposed_action_json')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function update(string $id, array $data): AiChatMessage
    {
        $message = $this->findById($id);
        $message->update($data);
        return $message->fresh();
    }

    public function delete(string $id): bool
    {
        return AiChatMessage::destroy($id);
    }

    public function deleteBySession(string $sessionId): int
    {
        return AiChatMessage::where('session_id', $sessionId)->delete();
    }

    public function getRecentWithProposals(int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return AiChatMessage::withProposal()
            ->with(['session.user'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}
