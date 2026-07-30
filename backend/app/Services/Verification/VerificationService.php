<?php

namespace App\Services\Verification;

use App\DTOs\VerificationResultDTO;
use App\Enums\NotificationType;
use App\Enums\VerificationStatus;
use App\Models\SocialStatusProof;
use App\Models\Child;
use App\Models\Utilisateur;
use App\Repositories\SocialStatusProofRepository;
use App\Repositories\ChildRepository;
use App\Services\Notification\NotificationService;
use App\Services\FiscalProfile\FiscalProfileIntegrationService;
use Illuminate\Support\Facades\DB;

class VerificationService
{
    public function __construct(
        private SocialStatusProofRepository $socialStatusProofRepository,
        private ChildRepository $childRepository,
        private NotificationService $notificationService,
        private FiscalProfileIntegrationService $fiscalProfileService
    ) {}

    public function verifySocialStatus(int $proofId, int $hrUserId): VerificationResultDTO
    {
        try {
            DB::beginTransaction();

            $proof = $this->socialStatusProofRepository->find($proofId);
            if (!$proof) {
                return VerificationResultDTO::failure('Social status proof not found');
            }

            if ($proof->status !== VerificationStatus::PENDING->value) {
                return VerificationResultDTO::failure('Proof is not in pending status');
            }

            // Verify the proof
            $this->socialStatusProofRepository->verifyProof($proofId);

            // Update user's marital status
            $user = Utilisateur::find($proof->utilisateur_id);
            if ($user) {
                $user->marital_status = $proof->social_status;
                $user->save();
            }

            // Create notification
            $this->notificationService->createNotification(
                $proof->utilisateur_id,
                NotificationType::SOCIAL_STATUS_APPROVED,
                [
                    'title' => 'Social Status Approved',
                    'message' => "Your social status has been updated to {$proof->social_status}",
                    'data' => ['proof_id' => $proofId, 'new_status' => $proof->social_status]
                ]
            );

            DB::commit();

            return VerificationResultDTO::success(
                'Social status verified successfully',
                ['proof_id' => $proofId, 'new_status' => $proof->social_status]
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return VerificationResultDTO::failure('Failed to verify social status: ' . $e->getMessage());
        }
    }

    public function rejectSocialStatus(int $proofId, string $reason, int $hrUserId): VerificationResultDTO
    {
        try {
            DB::beginTransaction();

            $proof = $this->socialStatusProofRepository->find($proofId);
            if (!$proof) {
                return VerificationResultDTO::failure('Social status proof not found');
            }

            if ($proof->status !== VerificationStatus::PENDING->value) {
                return VerificationResultDTO::failure('Proof is not in pending status');
            }

            // Reject the proof
            $this->socialStatusProofRepository->rejectProof($proofId, $reason);

            // Revert user's marital status to last verified status
            $user = Utilisateur::find($proof->utilisateur_id);
            if ($user) {
                $latestVerified = $this->socialStatusProofRepository->getLatestVerifiedByUtilisateur($proof->utilisateur_id);
                if ($latestVerified) {
                    $user->marital_status = $latestVerified->social_status;
                } else {
                    $user->marital_status = 'single';
                }
                $user->save();
            }

            // Create notification
            $this->notificationService->createNotification(
                $proof->utilisateur_id,
                NotificationType::SOCIAL_STATUS_REJECTED,
                [
                    'title' => 'Social Status Rejected',
                    'message' => "Your social status change was rejected. Reason: {$reason}",
                    'data' => ['proof_id' => $proofId, 'rejection_reason' => $reason]
                ]
            );

            DB::commit();

            return VerificationResultDTO::success(
                'Social status rejected successfully',
                ['proof_id' => $proofId]
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return VerificationResultDTO::failure('Failed to reject social status: ' . $e->getMessage());
        }
    }

    public function verifyChild(int $childId, int $hrUserId): VerificationResultDTO
    {
        try {
            DB::beginTransaction();

            $child = $this->childRepository->find($childId);
            if (!$child) {
                return VerificationResultDTO::failure('Child record not found');
            }

            if ($child->verified || $child->rejected) {
                return VerificationResultDTO::failure('Child is not in pending status');
            }

            // Verify the child
            $this->childRepository->verifyChild($childId);

            // Update user's children count
            $user = Utilisateur::find($child->utilisateur_id);
            if ($user) {
                $user->children_count = $this->childRepository->getByUtilisateur($child->utilisateur_id)
                    ->where('verified', true)
                    ->where('rejected', false)
                    ->count();
                $user->save();
            }

            // Create notification
            $this->notificationService->createNotification(
                $child->utilisateur_id,
                NotificationType::CHILD_APPROVED,
                [
                    'title' => 'Child Approved',
                    'message' => "Your child {$child->prenom} {$child->nom} has been verified",
                    'data' => ['child_id' => $childId, 'child_name' => "{$child->prenom} {$child->nom}"]
                ]
            );

            DB::commit();

            return VerificationResultDTO::success(
                'Child verified successfully',
                ['child_id' => $childId]
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return VerificationResultDTO::failure('Failed to verify child: ' . $e->getMessage());
        }
    }

    public function rejectChild(int $childId, string $reason, int $hrUserId): VerificationResultDTO
    {
        try {
            DB::beginTransaction();

            $child = $this->childRepository->find($childId);
            if (!$child) {
                return VerificationResultDTO::failure('Child record not found');
            }

            if ($child->verified || $child->rejected) {
                return VerificationResultDTO::failure('Child is not in pending status');
            }

            // Reject the child
            $this->childRepository->rejectChild($childId, $reason);

            // Update user's children count (exclude rejected children)
            $user = Utilisateur::find($child->utilisateur_id);
            if ($user) {
                $user->children_count = $this->childRepository->getByUtilisateur($child->utilisateur_id)
                    ->where('verified', true)
                    ->where('rejected', false)
                    ->count();
                $user->save();
            }

            // Create notification
            $this->notificationService->createNotification(
                $child->utilisateur_id,
                NotificationType::CHILD_REJECTED,
                [
                    'title' => 'Child Rejected',
                    'message' => "Your child {$child->prenom} {$child->nom} was rejected. Reason: {$reason}",
                    'data' => ['child_id' => $childId, 'rejection_reason' => $reason]
                ]
            );

            DB::commit();

            return VerificationResultDTO::success(
                'Child rejected successfully',
                ['child_id' => $childId]
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return VerificationResultDTO::failure('Failed to reject child: ' . $e->getMessage());
        }
    }
}
