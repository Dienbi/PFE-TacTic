<?php

namespace App\Services;

use App\Models\Competence;
use App\Models\CvUpload;
use App\Repositories\CvUploadRepository;
use App\Repositories\CompetenceRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CvConfirmationService
{
    private CvUploadRepository $cvUploadRepository;
    private CompetenceRepository $competenceRepository;

    public function __construct(
        CvUploadRepository $cvUploadRepository,
        CompetenceRepository $competenceRepository
    ) {
        $this->cvUploadRepository = $cvUploadRepository;
        $this->competenceRepository = $competenceRepository;
    }

    public function confirmSkills(int $cvUploadId, array $confirmedSkills): void
    {
        $cvUpload = $this->cvUploadRepository->findOrFail($cvUploadId);

        if ($cvUpload->status !== 'completed') {
            throw new \RuntimeException('CV upload must быть completed before confirming skills');
        }

        try {
            DB::beginTransaction();

            $userId = $cvUpload->utilisateur_id;
            $competences = $this->mapExtractedSkillsToCompetences($confirmedSkills);

            $this->updateUserSkills($userId, $competences);

            // Clear cache after confirmation
            Cache::forget("ai:cv_extraction:{$cvUploadId}");

            DB::commit();

            Log::info("Skills confirmed for CV upload ID: {$cvUploadId}");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to confirm skills for CV upload ID {$cvUploadId}: ".$e->getMessage());
            throw $e;
        }
    }

    public function mapExtractedSkillsToCompetences(array $extractedSkills): array
    {
        $competences = [];

        // Map technical skills
        foreach ($extractedSkills['technical_skills'] ?? [] as $skill) {
            $competences[] = [
                'nom' => $skill['name'],
                'niveau' => $this->confidenceToLevel($skill['confidence'] ?? 'medium'),
                'category' => 'technical',
            ];
        }

        // Map soft skills
        foreach ($extractedSkills['soft_skills'] ?? [] as $skill) {
            $competences[] = [
                'nom' => $skill['name'],
                'niveau' => $this->confidenceToLevel($skill['confidence'] ?? 'medium'),
                'category' => 'soft',
            ];
        }

        return $competences;
    }

    public function updateUserSkills(int $userId, array $skills): void
    {
        $user = \App\Models\Utilisateur::findOrFail($userId);

        // Sync skills - this will add new skills and remove ones not in the list
        foreach ($skills as $skillData) {
            $competence = Competence::firstOrCreate(
                ['nom' => $skillData['nom']],
                ['niveau' => $skillData['niveau']]
            );

            // Attach with pivot niveau
            $user->competences()->syncWithoutDetaching([
                $competence->id => ['niveau' => $skillData['niveau']],
            ]);
        }
    }

    private function confidenceToLevel(string $confidence): int
    {
        return match ($confidence) {
            'high' => 5,
            'medium' => 3,
            'low' => 1,
            default => 3,
        };
    }
}
