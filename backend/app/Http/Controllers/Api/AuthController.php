<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Services\AuthService;
use App\Models\Competence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    /**
     * Login user and return JWT token
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->email,
            $request->password
        );

        if (!$result) {
            return response()->json([
                'message' => 'Identifiants invalides ou compte désactivé.',
            ], 401);
        }

        return response()->json($result);
    }

    /**
     * Register a new user
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->json($result, 201);
    }

    /**
     * Logout user (invalidate token)
     */
    public function logout(): JsonResponse
    {
        $this->authService->logout();

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }

    /**
     * Refresh JWT token
     */
    public function refresh(): JsonResponse
    {
        $result = $this->authService->refresh();

        return response()->json($result);
    }

    /**
     * Get authenticated user
     */
    public function me(): JsonResponse
    {
        $user = $this->authService->me();

        if ($user) {
            $user->load('competences');
        }

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Change password
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $this->authService->me();

        $success = $this->authService->changePassword(
            $user->id,
            $request->current_password,
            $request->new_password
        );

        if (!$success) {
            return response()->json([
                'message' => 'Mot de passe actuel incorrect.',
            ], 400);
        }

        return response()->json([
            'message' => 'Mot de passe changé avec succès.',
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();

        $rules = [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:utilisateurs,email,' . $user->id,
            'telephone' => 'nullable|string|max:20',
            'adresse' => 'nullable|string|max:255',
        ];

        // Authorization for RH only fields
        if ($user->role === \App\Enums\Role::RH) {
            $rules['matricule'] = 'required|string|unique:utilisateurs,matricule,' . $user->id;
            $rules['role'] = 'required|string|in:RH,CHEF_EQUIPE,EMPLOYE';
            $rules['date_embauche'] = 'nullable|date';
            $rules['salaire_base'] = 'nullable|numeric|min:0';
        }

        $validated = $request->validate($rules);

        $updatedUser = $this->authService->updateProfile($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $updatedUser
        ]);
    }

    /**
     * Update user skills
     */
    public function updateSkills(Request $request): JsonResponse
    {
        $request->validate([
            'skills' => 'array',
            'skills.*' => 'string|max:50',
        ]);

        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $skills = $request->input('skills', []);
        $skillIds = [];

        foreach ($skills as $skillName) {
            $competence = Competence::firstOrCreate(
                ['nom' => $skillName],
                ['niveau' => 1]
            );
            $skillIds[] = $competence->id;
        }

        // Use sync to update pivot table without detaching existing ones could be an option, 
        // but typically skills update replaces the list. Here we follow LinkedIn style: 
        // if user sends a list, we assume it's the current desired list.
        $user->competences()->sync($skillIds);
        
        // Reload user with competences
        $user->load('competences');

        return response()->json([
            'message' => 'Compétences mises à jour avec succès',
            'user' => $user
        ]);
    }
}

