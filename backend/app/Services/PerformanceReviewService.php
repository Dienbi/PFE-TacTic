<?php

namespace App\Services;

use App\Contracts\Repositories\PerformanceReviewRepositoryInterface;
use App\Contracts\Services\NotificationServiceInterface;
use App\Models\PerformanceReview;
use Illuminate\Database\Eloquent\Collection;
use InvalidArgumentException;

class PerformanceReviewService
{
    public function __construct(
        protected PerformanceReviewRepositoryInterface $repository,
        protected NotificationServiceInterface $notificationService
    ) {}

    public function create(array $data, int $chefId): PerformanceReview
    {
        // Validate monthly limit
        $exists = $this->repository->existsForMonth(
            $data['utilisateur_id'],
            $chefId,
            $data['review_date']
        );

        if ($exists) {
            throw new InvalidArgumentException('Feedback already exists for this employee in the specified month.');
        }

        $data['chef_id'] = $chefId;
        $review = $this->repository->create($data);

        // Trigger notifications (wrap in try-catch to prevent broadcasting errors from failing the operation)
        try {
            $this->notificationService->notifyFeedbackCreated(
                $review->utilisateur_id,
                $review->chef_id,
                $review->score,
                $review->message
            );
        } catch (\Exception $e) {
            // Log error but don't fail the operation
            \Log::warning('Failed to dispatch feedback notification: ' . $e->getMessage());
        }

        return $review;
    }

    public function update(int $id, array $data, $chefId = null): PerformanceReview
    {
        $review = $this->repository->findById($id);
        
        if (!$review) {
            throw new InvalidArgumentException('Performance review not found.');
        }

        // Check if chef is authorized (if chefId provided)
        if ($chefId !== null && $review->chef_id !== $chefId) {
            throw new InvalidArgumentException('You are not authorized to update this feedback.');
        }

        // If review_date is being changed, check for conflicts
        if (isset($data['review_date']) && $data['review_date'] !== $review->review_date->format('Y-m-d')) {
            $exists = $this->repository->existsForMonth(
                $review->utilisateur_id,
                $review->chef_id,
                $data['review_date']
            );

            if ($exists) {
                throw new InvalidArgumentException('Feedback already exists for this employee in the specified month.');
            }
        }

        $updatedReview = $this->repository->update($id, $data);

        // Trigger notifications (wrap in try-catch to prevent broadcasting errors from failing the operation)
        try {
            $this->notificationService->notifyFeedbackUpdated(
                $updatedReview->utilisateur_id,
                $updatedReview->chef_id,
                $updatedReview->score
            );
        } catch (\Exception $e) {
            // Log error but don't fail the operation
            \Log::warning('Failed to dispatch feedback update notification: ' . $e->getMessage());
        }

        return $updatedReview;
    }

    public function delete(int $id, $chefId = null): bool
    {
        $review = $this->repository->findById($id);
        
        if (!$review) {
            throw new InvalidArgumentException('Performance review not found.');
        }

        // Check if chef is authorized (if chefId provided)
        if ($chefId !== null && $review->chef_id !== $chefId) {
            throw new InvalidArgumentException('You are not authorized to delete this feedback.');
        }

        $employeeId = $review->utilisateur_id;
        $chefIdToDelete = $review->chef_id;

        $result = $this->repository->delete($id);

        if ($result) {
            // Trigger notifications (wrap in try-catch to prevent broadcasting errors from failing the operation)
            try {
                $this->notificationService->notifyFeedbackDeleted($employeeId, $chefIdToDelete);
            } catch (\Exception $e) {
                // Log error but don't fail the operation
                \Log::warning('Failed to dispatch feedback deletion notification: ' . $e->getMessage());
            }
        }

        return $result;
    }

    public function findById(int $id): ?PerformanceReview
    {
        return $this->repository->findById($id);
    }

    public function getEmployeeHistory(int $employeeId): Collection
    {
        return $this->repository->getEmployeeHistory($employeeId);
    }

    public function getTeamFeedback(int $chefId): Collection
    {
        return $this->repository->getTeamFeedback($chefId);
    }

    public function getAllFeedback(): Collection
    {
        return $this->repository->getAllFeedback();
    }

    public function getLatestByEmployee(int $employeeId): ?PerformanceReview
    {
        return $this->repository->getLatestByEmployee($employeeId);
    }
}
