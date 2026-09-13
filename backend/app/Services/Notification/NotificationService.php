<?php

namespace App\Services\Notification;

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Repositories\NotificationRepository;

class NotificationService
{
    public function __construct(
        private NotificationRepository $notificationRepository
    ) {
    }

    public function createNotification(
        int $userId,
        NotificationType $type,
        array $data
    ): Notification {
        return $this->notificationRepository->create([
            'utilisateur_id' => $userId,
            'type' => $type->value,
            'title' => $data['title'],
            'message' => $data['message'],
            'data' => $data['data'] ?? null,
        ]);
    }

    public function markAsRead(int $notificationId, int $userId): bool
    {
        $notification = $this->notificationRepository->find($notificationId);
        if (!$notification || $notification->utilisateur_id !== $userId) {
            return false;
        }

        return $this->notificationRepository->markAsRead($notificationId);
    }

    public function markAllAsRead(int $userId): bool
    {
        return $this->notificationRepository->markAllAsReadByUser($userId);
    }

    public function getUnreadByUser(int $userId): array
    {
        return $this->notificationRepository->getUnreadByUser($userId)->toArray();
    }

    public function getAllByUser(int $userId): array
    {
        return $this->notificationRepository->getAllByUser($userId)->toArray();
    }
}
