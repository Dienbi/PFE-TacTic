<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\SocialStatusProofRepository;
use App\Services\Verification\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SocialStatusController extends Controller
{
    public function __construct(
        protected SocialStatusProofRepository $socialStatusProofRepository,
        protected VerificationService $verificationService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'social_status' => 'required|in:single,married,divorced,widowed',
            'document' => 'required_unless:social_status,single|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $userId = $request->user()->id;
        $data = [
            'social_status' => $request->social_status,
            'status' => 'pending',
        ];

        // Handle document upload if not single
        if ($request->social_status !== 'single' && $request->hasFile('document')) {
            $path = $request->file('document')->store('documents/social_status_proofs', 'public');
            $data['document_path'] = $path;
        }

        // Create proof record (pending status)
        $proof = $this->socialStatusProofRepository->createForUtilisateur($userId, $data);

        return response()->json($proof, 201);
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $proofs = $this->socialStatusProofRepository->getByUtilisateur($userId);

        return response()->json($proofs);
    }

    public function verify(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $result = $this->verificationService->verifySocialStatus($id, $request->user()->id);

        if (!$result->success) {
            return response()->json([
                'message' => $result->message,
            ], 400);
        }

        return response()->json([
            'message' => $result->message,
            'data' => $result->data,
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $result = $this->verificationService->rejectSocialStatus(
            $id,
            $request->rejection_reason,
            $request->user()->id
        );

        if (!$result->success) {
            return response()->json([
                'message' => $result->message,
            ], 400);
        }

        return response()->json([
            'message' => $result->message,
        ]);
    }

    public function indexForHR(Request $request): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $pending = $this->socialStatusProofRepository->getPendingForAllUsers();

        return response()->json($pending);
    }
}
