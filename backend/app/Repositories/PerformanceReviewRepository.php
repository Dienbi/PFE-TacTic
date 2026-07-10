<?php

namespace App\Repositories;

use App\Contracts\Repositories\PerformanceReviewRepositoryInterface;
use App\Models\PerformanceReview;
use Illuminate\Database\Eloquent\Collection;

class PerformanceReviewRepository implements PerformanceReviewRepositoryInterface
{
    public function create(array $data): PerformanceReview
    {
        return PerformanceReview::create($data);
    }

    public function update(int $id, array $data): PerformanceReview
    {
        $review = $this->findById($id);
        if (!$review) {
            throw new \InvalidArgumentException('Performance review not found.');
        }
        $review->update($data);
        return $review->fresh();
    }

    public function delete(int $id): bool
    {
        $review = $this->findById($id);
        if (!$review) {
            throw new \InvalidArgumentException('Performance review not found.');
        }
        return $review->delete();
    }

    public function findById(int $id): ?PerformanceReview
    {
        return PerformanceReview::with(['employee', 'chef'])->find($id);
    }

    public function findByEmployeeAndChefAndDate(int $employeeId, int $chefId, string $date): ?PerformanceReview
    {
        return PerformanceReview::where('utilisateur_id', $employeeId)
            ->where('chef_id', $chefId)
            ->where('review_date', $date)
            ->first();
    }

    public function getEmployeeHistory(int $employeeId): Collection
    {
        return PerformanceReview::with(['chef'])
            ->forEmployee($employeeId)
            ->orderBy('review_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getTeamFeedback(int $chefId): Collection
    {
        return PerformanceReview::with(['employee'])
            ->byChef($chefId)
            ->orderBy('review_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getAllFeedback(): Collection
    {
        return PerformanceReview::with(['employee', 'chef'])
            ->orderBy('review_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getLatestByEmployee(int $employeeId): ?PerformanceReview
    {
        return PerformanceReview::latestForEmployee($employeeId)->first();
    }

    public function existsForMonth(int $employeeId, int $chefId, string $date): bool
    {
        return PerformanceReview::where('utilisateur_id', $employeeId)
            ->where('chef_id', $chefId)
            ->where('review_date', $date)
            ->exists();
    }
}
