<?php

namespace App\Repositories\FiscalProfile;

use App\Models\AiChatSession;
use Illuminate\Support\Str;

class AiChatSessionRepository
{
    public function create(array $data): AiChatSession
    {
        return AiChatSession::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            'user_id' => $data['user_id'],
            'context_type' => $data['context_type'] ?? 'profile_group_creation',
        ]);
    }

    public function findById(string $id): ?AiChatSession
    {
        return AiChatSession::with(['user', 'messages'])->find($id);
    }

    public function findByUser(int $userId): \Illuminate\Database\Eloquent\Collection
    {
        return AiChatSession::where('user_id', $userId)
            ->with(['messages' => function ($query) {
                $query->orderBy('created_at', 'asc');
            }])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findRecentByUser(int $userId, string $contextType = 'profile_group_creation'): ?AiChatSession
    {
        return AiChatSession::where('user_id', $userId)
            ->where('context_type', $contextType)
            ->orderBy('created_at', 'desc')
            ->first();
    }

    public function getAll(): \Illuminate\Database\Eloquent\Collection
    {
        return AiChatSession::with(['user', 'messages'])->orderBy('created_at', 'desc')->get();
    }

    public function update(string $id, array $data): AiChatSession
    {
        $session = $this->findById($id);
        $session->update($data);
        return $session->fresh();
    }

    public function delete(string $id): bool
    {
        return AiChatSession::destroy($id);
    }

    public function deleteByUser(int $userId): int
    {
        return AiChatSession::where('user_id', $userId)->delete();
    }
}
