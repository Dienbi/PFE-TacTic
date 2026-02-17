<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobRequestRequest;
use App\Services\JobRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobRequestController extends Controller
{
    public function __construct(
        protected JobRequestService $jobRequestService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isRH()) {
            $jobRequests = $this->jobRequestService->getAll();
        } elseif ($user->isChefEquipe()) {
            $jobRequests = $this->jobRequestService->getByDemandeur($user->id);
        } else {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        return response()->json($jobRequests);
    }

    public function show(int $id): JsonResponse
    {
        $jobRequest = $this->jobRequestService->getById($id);

        if (!$jobRequest) {
            return response()->json(['message' => 'Demande de poste non trouvée.'], 404);
        }

        return response()->json($jobRequest);
    }

    public function pending(): JsonResponse
    {
        return response()->json($this->jobRequestService->getPending());
    }

    public function store(JobRequestRequest $request): JsonResponse
    {
        $result = $this->jobRequestService->create(
            $request->user()->id,
            $request->validated()
        );

        if (is_array($result) && isset($result['error'])) {
            return response()->json(['message' => $result['error']], 400);
        }

        return response()->json($result, 201);
    }

    public function update(int $id, JobRequestRequest $request): JsonResponse
    {
        $result = $this->jobRequestService->update($id, $request->validated());

        if (is_array($result) && isset($result['error'])) {
            return response()->json(['message' => $result['error']], 400);
        }

        return response()->json(['message' => 'Demande mise à jour.']);
    }

    public function approve(int $id, Request $request): JsonResponse
    {
        $result = $this->jobRequestService->approve($id, $request->user()->id);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 400);
        }

        return response()->json([
            'message' => 'Demande approuvée et poste créé.',
            'job_post' => $result['job_post'],
        ]);
    }

    public function reject(int $id, Request $request): JsonResponse
    {
        $request->validate(['raison' => 'required|string|min:10']);

        $result = $this->jobRequestService->reject(
            $id,
            $request->raison,
            $request->user()->id
        );

        if (is_array($result) && isset($result['error'])) {
            return response()->json(['message' => $result['error']], 400);
        }

        return response()->json(['message' => 'Demande rejetée.']);
    }

    public function destroy(int $id): JsonResponse
    {
        $result = $this->jobRequestService->delete($id);

        if (is_array($result) && isset($result['error'])) {
            return response()->json(['message' => $result['error']], 400);
        }

        return response()->json(['message' => 'Demande supprimée.']);
    }
}
