<?php

namespace App\Services\FiscalProfile;

use App\Models\AiChatMessage;
use App\Models\AiChatSession;
use Illuminate\Support\Str;

/**
 * AiChatSessionService
 *
 * Single Responsibility: Manage AI chat sessions and messages for fiscal profile operations.
 * Handles session creation, message storage, and history retrieval.
 */
class AiChatSessionService
{
    /**
     * Create a new AI chat session.
     *
     * @param string $userId
     * @param string $contextType
     * @return AiChatSession
     */
    public function createSession(string $userId, string $contextType = 'profile_group_creation'): AiChatSession
    {
        return AiChatSession::create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'context_type' => $contextType,
        ]);
    }

    /**
     * Add a message to a chat session.
     *
     * @param string $sessionId
     * @param string $role
     * @param string $content
     * @param array|null $proposedAction
     * @return AiChatMessage
     */
    public function addMessage(
        string $sessionId,
        string $role,
        string $content,
        ?array $proposedAction = null
    ): AiChatMessage {
        return AiChatMessage::create([
            'id' => (string) Str::uuid(),
            'session_id' => $sessionId,
            'role' => $role,
            'content' => $content,
            'proposed_action_json' => $proposedAction,
            'created_at' => now(),
        ]);
    }

    /**
     * Get the full message history for a session.
     *
     * @param string $sessionId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getSessionHistory(string $sessionId)
    {
        return AiChatMessage::where('session_id', $sessionId)
            ->orderBy('created_at', 'asc')
            ->get();
    }

    /**
     * Get a session by ID with messages.
     *
     * @param string $sessionId
     * @return AiChatSession|null
     */
    public function getSessionById(string $sessionId): ?AiChatSession
    {
        return AiChatSession::with('messages')->find($sessionId);
    }

    /**
     * Get all sessions for a user.
     *
     * @param string $userId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getUserSessions(string $userId)
    {
        return AiChatSession::byUser($userId)
            ->with(['messages' => function ($query) {
                $query->orderBy('created_at', 'asc');
            }])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get the most recent session for a user.
     *
     * @param string $userId
     * @param string $contextType
     * @return AiChatSession|null
     */
    public function getRecentSession(string $userId, string $contextType = 'profile_group_creation'): ?AiChatSession
    {
        return AiChatSession::byUser($userId)
            ->byContext($contextType)
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Get or create a session for a user.
     * Returns existing recent session if available, otherwise creates new one.
     *
     * @param string $userId
     * @param string $contextType
     * @return AiChatSession
     */
    public function getOrCreateSession(string $userId, string $contextType = 'profile_group_creation'): AiChatSession
    {
        $existing = $this->getRecentSession($userId, $contextType);

        if ($existing) {
            return $existing;
        }

        return $this->createSession($userId, $contextType);
    }

    /**
     * Delete a session and all its messages.
     *
     * @param string $sessionId
     * @return bool
     */
    public function deleteSession(string $sessionId): bool
    {
        $session = AiChatSession::find($sessionId);
        if (!$session) {
            return false;
        }

        return $session->delete();
    }

    /**
     * Format session history for AI API consumption.
     * Returns messages in the format expected by the AI service.
     *
     * @param string $sessionId
     * @return array
     */
    public function formatHistoryForAI(string $sessionId): array
    {
        $messages = $this->getSessionHistory($sessionId);

        return $messages->map(function ($message) {
            return [
                'role' => $message->role,
                'content' => $message->content,
                'proposed_action' => $message->proposed_action_json,
            ];
        })->toArray();
    }
}
