<?php

namespace App\Services;

use App\Models\Utilisateur;
use App\Repositories\UtilisateurRepository;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthService
{
    public function __construct(
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    public function login(string $email, string $password): ?array
    {
        $utilisateur = $this->utilisateurRepository->findByEmail($email);

        if (!$utilisateur || !Hash::check($password, $utilisateur->password)) {
            return null;
        }

        if (!$utilisateur->actif) {
            return null;
        }

        $token = JWTAuth::fromUser($utilisateur);
        $this->utilisateurRepository->updateLastConnection($utilisateur->id);

        ActivityLogger::log('LOGIN', 'User logged in', $utilisateur->id);

        return $this->respondWithToken($token, $utilisateur);
    }

    public function register(array $data): array
    {
        $data['password'] = Hash::make($data['password']);
        $data['matricule'] = $this->utilisateurRepository->generateMatricule();

        $utilisateur = $this->utilisateurRepository->create($data);
        $token = JWTAuth::fromUser($utilisateur);

        return $this->respondWithToken($token, $utilisateur);
    }

    public function logout(): void
    {
        $user = JWTAuth::user();
        if ($user) {
            ActivityLogger::log('LOGOUT', 'User logged out', $user->id);
        }
        JWTAuth::invalidate(JWTAuth::getToken());
    }

    public function refresh(): array
    {
        $token = JWTAuth::refresh(JWTAuth::getToken());
        $utilisateur = JWTAuth::user();

        return $this->respondWithToken($token, $utilisateur);
    }

    public function me(): ?Utilisateur
    {
        return JWTAuth::user();
    }

    public function changePassword(int $utilisateurId, string $currentPassword, string $newPassword): bool
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);

        if (!Hash::check($currentPassword, $utilisateur->password)) {
            return false;
        }

        return $this->utilisateurRepository->update($utilisateurId, [
            'password' => Hash::make($newPassword),
        ]);
    }

    public function updateProfile(array $data): Utilisateur
    {
        $user = JWTAuth::user();
        if (!$user) {
            throw new \Exception('User not found');
        }

        // Use repository to update
        $this->utilisateurRepository->update($user->id, $data);

        return $user->refresh();
    }

    protected function respondWithToken(string $token, Utilisateur $utilisateur): array
    {
        // Load competences relationship
        $utilisateur->load('competences');

        return [
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => JWTAuth::factory()->getTTL() * 60,
            'user' => $utilisateur,
        ];
    }
}
