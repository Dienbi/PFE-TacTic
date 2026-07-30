<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\ChildRepository;
use App\Services\Verification\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ChildController extends Controller
{
    public function __construct(
        protected ChildRepository $childRepository,
        protected VerificationService $verificationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $children = $this->childRepository->getByUtilisateur($userId);

        return response()->json($children);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'date_naissance' => 'required|date',
            'status' => 'required|in:healthy,disabled,university',
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $userId = $request->user()->id;
        $data = $request->only(['nom', 'prenom', 'date_naissance', 'status']);
        $data['verified'] = false;
        $data['rejected'] = false;

        // Handle document upload
        if ($request->hasFile('document')) {
            $folder = $request->status === 'disabled' 
                ? 'documents/medical_certificates' 
                : 'documents/birth_certificates';
            $path = $request->file('document')->store($folder, 'public');
            $data['document_path'] = $path;
        }

        $child = $this->childRepository->createForUtilisateur($userId, $data);

        return response()->json($child, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'sometimes|string|max:255',
            'date_naissance' => 'sometimes|date',
            'status' => 'sometimes|in:healthy,disabled,university',
            'document' => 'sometimes|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $userId = $request->user()->id;
        $data = $request->only(['nom', 'prenom', 'date_naissance', 'status']);
        $data['verified'] = false;
        $data['rejected'] = false;

        // Handle document upload if provided
        if ($request->hasFile('document')) {
            $child = $this->childRepository->find($id);
            
            // Delete old document if exists
            if ($child && $child->document_path) {
                Storage::disk('public')->delete($child->document_path);
            }

            $folder = $request->status === 'disabled' 
                ? 'documents/medical_certificates' 
                : 'documents/birth_certificates';
            $path = $request->file('document')->store($folder, 'public');
            $data['document_path'] = $path;
        }

        $this->childRepository->updateChild($id, $data);

        return response()->json([
            'message' => 'Child updated successfully.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $child = $this->childRepository->find($id);
        
        if ($child && $child->document_path) {
            Storage::disk('public')->delete($child->document_path);
        }

        $this->childRepository->deleteChild($id);

        return response()->json([
            'message' => 'Child deleted successfully.',
        ]);
    }

    public function verify(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isRH()) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $result = $this->verificationService->verifyChild($id, $request->user()->id);

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

        $result = $this->verificationService->rejectChild(
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

        $pending = $this->childRepository->getPendingForAllUsers();

        return response()->json($pending);
    }
}
