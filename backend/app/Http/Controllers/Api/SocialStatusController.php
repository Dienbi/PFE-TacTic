<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\SocialStatusProofRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SocialStatusController extends Controller
{
    public function __construct(
        protected SocialStatusProofRepository $socialStatusProofRepository
    ) {}

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'social_status' => 'required|in:single,married,divorced,widowed',
            'document' => 'required_unless:social_status,single|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $userId = $request->user()->id;
        $data = ['social_status' => $request->social_status];

        // Handle document upload if not single
        if ($request->social_status !== 'single' && $request->hasFile('document')) {
            $path = $request->file('document')->store('documents/social_status_proofs', 'public');
            $data['document_path'] = $path;
        }

        // Create proof record
        $proof = $this->socialStatusProofRepository->createForUtilisateur($userId, $data);

        // Update user's marital status
        $user = $request->user();
        $user->marital_status = $request->social_status;
        $user->save();

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

        $this->socialStatusProofRepository->verifyProof($id);

        return response()->json([
            'message' => 'Social status proof verified successfully.',
        ]);
    }
}
