<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\NotificationRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationRepository $notificationRepository
    ) {}

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $notifications = $this->notificationRepository->getAllByUser($userId);

        return response()->json($notifications);
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;
        $success = $this->notificationRepository->markAsRead($id, $userId);

        if (!$success) {
            return response()->json([
                'message' => 'Notification not found or unauthorized.',
            ], 404);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $this->notificationRepository->markAllAsReadByUser($userId);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }

    public function unread(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $notifications = $this->notificationRepository->getUnreadByUser($userId);

        return response()->json($notifications);
    }
}
