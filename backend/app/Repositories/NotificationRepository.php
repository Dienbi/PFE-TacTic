<?php

namespace App\Repositories;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Collection;

class NotificationRepository extends BaseRepository
{
    public function __construct(Notification $model)
    {
        parent::__construct($model);
    }

    public function create(array $data): Notification
    {
        return $this->model->create($data);
    }

    public function markAsRead(int $notificationId): bool
    {
        return $this->update($notificationId, [
            'read' => true,
            'read_at' => now(),
        ]);
    }

    public function markAllAsReadByUser(int $userId): bool
    {
        return $this->model->where('utilisateur_id', $userId)
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now(),
            ]) > 0;
    }

    public function getUnreadByUser(int $userId): Collection
    {
        return $this->model->where('utilisateur_id', $userId)
            ->where('read', false)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getAllByUser(int $userId): Collection
    {
        return $this->model->where('utilisateur_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
