<?php

namespace App\Services\FiscalProfile;

use App\Models\Utilisateur;
use App\Models\FiscalProfileGroup;
use App\Repositories\ChildRepository;
use App\Services\FiscalProfile\FiscalProfileAssignmentService;

class FiscalProfileIntegrationService
{
    public function __construct(
        private ChildRepository $childRepository,
        private FiscalProfileAssignmentService $assignmentService
    ) {
    }

    public function suggestProfile(int $utilisateurId): ?array
    {
        $user = Utilisateur::find($utilisateurId);
        if (!$user) {
            return null;
        }

        $children = $this->childRepository->getByUtilisateur($utilisateurId)
            ->where('verified', true)
            ->where('rejected', false);

        $disabledCount = $children->where('status', 'disabled')->count();
        $studentCount = $children->where('status', 'university')->count();
        $totalCount = $children->count();

        // Find matching fiscal profile group
        $group = FiscalProfileGroup::where('gender', $user->gender)
            ->where('marital_status', $user->marital_status)
            ->where('children_count', $totalCount)
            ->where('disabled_children_count', $disabledCount)
            ->where('student_non_scholarship_children_count', $studentCount)
            ->first();

        if ($group) {
            return [
                'exists' => true,
                'group_id' => $group->id,
                'label' => $group->label,
                'attributes' => [
                    'gender' => $group->gender,
                    'marital_status' => $group->marital_status,
                    'children_count' => $group->children_count,
                    'disabled_children_count' => $group->disabled_children_count,
                    'student_non_scholarship_children_count' => $group->student_non_scholarship_children_count,
                ],
            ];
        }

        // Suggest creating a new group
        return [
            'exists' => false,
            'proposed' => [
                'gender' => $user->gender,
                'marital_status' => $user->marital_status,
                'children_count' => $totalCount,
                'disabled_children_count' => $disabledCount,
                'student_non_scholarship_children_count' => $studentCount,
                'label' => $this->generateLabel($user->gender, $user->marital_status, $totalCount, $disabledCount, $studentCount),
            ],
        ];
    }

    public function assignProfile(int $utilisateurId, string $groupId, string $effectiveFrom, int $assignedBy): bool
    {
        try {
            $group = FiscalProfileGroup::findOrFail($groupId);

            $attributes = [
                'gender' => $group->gender,
                'marital_status' => $group->marital_status,
                'children_count' => $group->children_count,
                'disabled_children_count' => $group->disabled_children_count,
                'student_non_scholarship_children_count' => $group->student_non_scholarship_children_count,
            ];

            $this->assignmentService->assignProfile(
                $utilisateurId,
                $attributes,
                $effectiveFrom,
                $assignedBy,
                null
            );

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function generateLabel(string $gender, string $maritalStatus, int $childrenCount, int $disabledCount, int $studentCount): string
    {
        $parts = [
            ucfirst($gender),
            ucfirst($maritalStatus),
        ];

        if ($childrenCount > 0) {
            $parts[] = "{$childrenCount} children";
            if ($disabledCount > 0) {
                $parts[] = "({$disabledCount} disabled)";
            }
            if ($studentCount > 0) {
                $parts[] = "({$studentCount} students)";
            }
        } else {
            $parts[] = 'No children';
        }

        return implode(' - ', $parts);
    }
}
