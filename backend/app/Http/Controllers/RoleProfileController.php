<?php

namespace App\Http\Controllers;

use App\Services\RoleProfileService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RoleProfileController extends Controller
{
    public function __construct(
        protected RoleProfileService $roleProfileService
    ) {}

    public function index(): JsonResponse
    {
        $profiles = $this->roleProfileService->getAll();
        return response()->json($profiles);
    }

    public function show($id): JsonResponse
    {
        $profile = $this->roleProfileService->findById($id);
        return response()->json($profile);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'horaire_type' => 'required|in:fixed,shift,hourly',
            'salary_type' => 'required|in:fixed_monthly,hourly,commission,piece_rate',
            'weekly_hours' => 'nullable|numeric|min:0|max:168',
            'overtime_eligible' => 'boolean',
            'overtime_rate_multiplier' => 'nullable|numeric|min:1|max:5',
            'base_salary_min' => 'nullable|numeric|min:0',
            'base_salary_max' => 'nullable|numeric|min:0',
            'cnss_regime' => 'nullable|string',
        ]);

        try {
            $profile = $this->roleProfileService->create($validated);
            return response()->json($profile, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'horaire_type' => 'sometimes|in:fixed,shift,hourly',
            'salary_type' => 'sometimes|in:fixed_monthly,hourly,commission,piece_rate',
            'weekly_hours' => 'nullable|numeric|min:0|max:168',
            'overtime_eligible' => 'boolean',
            'overtime_rate_multiplier' => 'nullable|numeric|min:1|max:5',
            'base_salary_min' => 'nullable|numeric|min:0',
            'base_salary_max' => 'nullable|numeric|min:0',
            'cnss_regime' => 'nullable|string',
        ]);

        try {
            $profile = $this->roleProfileService->update($id, $validated);
            return response()->json($profile);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $profile = $this->roleProfileService->delete($id);
            return response()->json(['message' => 'Role profile deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function getEmployees($id): JsonResponse
    {
        $employees = $this->roleProfileService->getEmployees($id);
        return response()->json($employees);
    }

    public function search(Request $request): JsonResponse
    {
        $query = $request->get('q', '');
        $profiles = $this->roleProfileService->searchByName($query);
        return response()->json($profiles);
    }
}
