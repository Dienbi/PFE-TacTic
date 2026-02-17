<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobPostRequest;
use App\Services\JobPostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobPostController extends Controller
{
    public function __construct(
        protected JobPostService $jobPostService
    ) {}

    /**
     * Get job posts (role-based filtering)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isRH()) {
            // HR sees all posts
            $jobPosts = $this->jobPostService->getAll();
        } elseif ($user->isEmploye()) {
            // Employees see published posts they haven't applied to
            $jobPosts = $this->jobPostService->getForEmployee($user->id);
        } else {
            // Managers see published posts
            $jobPosts = $this->jobPostService->getPublished();
        }

        return response()->json($jobPosts);
    }

    /**
     * Get job post by ID
     */
    public function show(int $id): JsonResponse
    {
        $jobPost = $this->jobPostService->getById($id);

        if (!$jobPost) {
            return response()->json([
                'message' => 'Poste non trouvé.',
            ], 404);
        }

        return response()->json($jobPost);
    }

    /**
     * Get open job posts
     */
    public function open(): JsonResponse
    {
        $jobPosts = $this->jobPostService->getOpen();

        return response()->json($jobPosts);
    }

    /**
     * Create job post (HR only)
     */
    public function store(JobPostRequest $request): JsonResponse
    {
        $data = $request->validated();

        $result = $this->jobPostService->create(
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
     * Update job post (HR only)
     */
    public function update(int $id, JobPostRequest $request): JsonResponse
    {
        $data = $request->validated();

        $result = $this->jobPostService->update($id, $data);

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'message' => 'Poste mis à jour avec succès.',
        ]);
    }

    /**
     * Publish job post (HR only)
     */
    public function publish(int $id, Request $request): JsonResponse
    {
        $result = $this->jobPostService->publish($id, $request->user()->id);

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'message' => 'Poste publié avec succès.',
        ]);
    }

    /**
     * Close job post (HR only)
     */
    public function close(int $id, Request $request): JsonResponse
    {
        $result = $this->jobPostService->close($id, $request->user()->id);

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'message' => 'Poste fermé.',
        ]);
    }

    /**
     * Delete job post (HR only)
     */
    public function destroy(int $id): JsonResponse
    {
        $result = $this->jobPostService->delete($id);

        if (is_array($result) && isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'message' => 'Poste supprimé.',
        ]);
    }
}
