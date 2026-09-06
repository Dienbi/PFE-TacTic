<?php

namespace App\Http\Controllers\Api\FiscalProfile;

use App\Http\Controllers\Controller;
use App\Services\FiscalProfile\AiChatSessionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AiChatController extends Controller
{
    private AiChatSessionService $chatSessionService;

    public function __construct(AiChatSessionService $chatSessionService)
    {
        $this->chatSessionService = $chatSessionService;
    }

    /**
     * Send a message to the AI chatbot.
     * POST /api/ai-chat/message
     */
    public function sendMessage(Request $request): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string',
            'session_id' => 'nullable|string',
        ]);

        try {
            // Get or create session
            if (isset($validated['session_id'])) {
                $session = $this->chatSessionService->getSessionById($validated['session_id']);
                if (!$session || $session->user_id !== Auth::id()) {
                    $session = $this->chatSessionService->getOrCreateSession(Auth::id());
                }
            } else {
                $session = $this->chatSessionService->getOrCreateSession(Auth::id());
            }

            // Add user message
            $this->chatSessionService->addMessage(
                $session->id,
                'user',
                $validated['message']
            );

            // Call AI service (this would call the FastAPI service)
            // For now, return a placeholder response
            $aiResponse = $this->callAiService($session->id, $validated['message']);

            // Add AI message
            $aiMessage = $this->chatSessionService->addMessage(
                $session->id,
                'ai',
                $aiResponse['ai_message']['content'],
                $aiResponse['ai_message']['proposed_action'] ?? null
            );

            return response()->json([
                'session_id' => $session->id,
                'ai_message' => $aiMessage,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to process message',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get chat session history.
     * GET /api/ai-chat/session/{id}
     */
    public function getSession(string $id): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $session = $this->chatSessionService->getSessionById($id);

        if (!$session || $session->user_id !== Auth::id()) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        return response()->json($session);
    }

    /**
     * Get user's chat sessions.
     * GET /api/ai-chat/sessions
     */
    public function getSessions(): JsonResponse
    {
        if (Auth::user()->role->value !== 'RH') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $sessions = $this->chatSessionService->getUserSessions(Auth::id());
        return response()->json($sessions);
    }

    /**
     * Call the AI service.
     */
    private function callAiService(string $sessionId, string $message): array
    {
        $aiServiceUrl = config('services.ai.url', 'http://127.0.0.1:8001');

        // Get the JWT token from the request
        $token = request()->bearerToken();

        try {
            $response = \Illuminate\Support\Facades\Http::post("{$aiServiceUrl}/api/fiscal/chatbot/message", [
                'session_id' => $sessionId,
                'message' => $message,
                'auth_token' => $token,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'content' => 'AI service returned an error. Please try again.',
                'proposed_action' => null,
            ];
        } catch (\Exception $e) {
            return [
                'content' => 'Failed to connect to AI service. Please ensure the service is running.',
                'proposed_action' => null,
            ];
        }
    }
}
