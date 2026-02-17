<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobApplicationRequest;
use App\Services\JobApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    public function __construct(
        protected JobApplicationService $jobApplicationService
    ) {}

    /**
     * Get applications (role-based)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isRH()) {
            // HR sees all pending applications
            $applications = $this->jobApplicationService->getAll();
        } elseif ($user->isEmploye()) {
            // Employees see their own applications
            $applications = $this->jobApplicationService->getByUser($user->id);
        } else {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        return response()->json($applications);
    }

    /**
     * Get application by ID
     */
    public function show(int $id): JsonResponse
    {
        $application = $this->jobApplicationService->getById($id);

        if (!$application) {
            return response()->json([
                'message' => 'Candidature non trouvée.',
            ], 404);
        }

        return response()->json($application);
    }

    /**
     * Get applications for a job post
     */
    public function byJobPost(int $jobPostId): JsonResponse
    {
        $applications = $this->jobApplicationService->getByJobPost($jobPostId);

        return response()->json($applications);
    }

    /**
     * Submit application (employees only)
     */
    public function store(JobApplicationRequest $request): JsonResponse
    {
        $data = $request->validated();

        $result = $this->jobApplicationService->apply(
            $request->user()->id,
            $data
        );

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json($result, 201);
    }

    /**
     * Withdraw application (employees only)
     */
    public function withdraw(int $id, Request $request): JsonResponse
    {
        $result = $this->jobApplicationService->withdraw($id, $request->user()->id);

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'message' => 'Candidature retirée.',
        ]);
    }

    /**
     * Review application - accept, reject, or mark as reviewed (HR only)
     */
    public function review(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:accept,reject,reviewed',
        ]);

        $result = $this->jobApplicationService->review(
            $id,
            $request->user()->id,
            $request->action
        );

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'message' => 'Candidature traitée.',
        ]);
    }

}
