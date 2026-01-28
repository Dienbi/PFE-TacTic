<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Services\AuthService;
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
}
