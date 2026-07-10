<?php

namespace App\Contracts\Repositories;

use App\Models\PerformanceReview;
use Illuminate\Database\Eloquent\Collection;

interface PerformanceReviewRepositoryInterface
{
    public function create(array $data): PerformanceReview;
    public function update(int $id, array $data): PerformanceReview;
    public function delete(int $id): bool;
    public function findById(int $id): ?PerformanceReview;
    public function findByEmployeeAndChefAndDate(int $employeeId, int $chefId, string $date): ?PerformanceReview;
    public function getEmployeeHistory(int $employeeId): Collection;
    public function getTeamFeedback(int $chefId): Collection;
    public function getAllFeedback(): Collection;
    public function getLatestByEmployee(int $employeeId): ?PerformanceReview;
    public function existsForMonth(int $employeeId, int $chefId, string $date): bool;
}
