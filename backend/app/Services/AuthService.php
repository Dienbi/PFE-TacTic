<?php

namespace App\Services;

use App\Exceptions\UserNotFoundException;
use App\Models\Utilisateur;
use App\Repositories\UtilisateurRepository;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use App\Services\ActivityLogger;
class AuthService
{
    public function __construct(
        protected UtilisateurRepository $utilisateurRepository
    ) {}

    private function shouldLogPerf(): bool
    {
        return filter_var(env('PERF_LOG_ENABLED', false), FILTER_VALIDATE_BOOL);
    }

    public function login(string $email, string $password): ?array
    {
        $start = microtime(true);
        $last = $start;
        $metrics = [];

        $checkpoint = function (string $label) use (&$last, &$metrics) {
            $now = microtime(true);
            $metrics[$label] = round(($now - $last) * 1000, 2);
            $last = $now;
        };

        $utilisateur = $this->utilisateurRepository->findByEmail($email);
        $checkpoint('findByEmail');

        if (! $utilisateur || ! Hash::check($password, $utilisateur->password)) {
            if ($this->shouldLogPerf()) {
                Log::warning('auth.login.failed', [
                    'email' => $email,
                    'reason' => 'invalid_credentials',
                    'steps_ms' => $metrics,
                    'total_ms' => round((microtime(true) - $start) * 1000, 2),
                ]);
            }

            return null;
        }

        if (! $utilisateur->actif) {
            if ($this->shouldLogPerf()) {
                Log::warning('auth.login.failed', [
                    'email' => $email,
                    'user_id' => $utilisateur->id,
                    'reason' => 'inactive_account',
                    'steps_ms' => $metrics,
                    'total_ms' => round((microtime(true) - $start) * 1000, 2),
                ]);
            }

            return null;
        }

        $checkpoint('password_check');

        $token = auth()->login($utilisateur);
        $checkpoint('jwt_create');

        $this->utilisateurRepository->updateLastConnection($utilisateur->id);
        $checkpoint('update_last_connection');

        // Skip broadcast on login to avoid blocking the response on websocket delivery
        ActivityLogger::log('LOGIN', 'User logged in', $utilisateur->id, false);
        $checkpoint('activity_log');

        if ($this->shouldLogPerf()) {
            Log::info('auth.login.success', [
                'email' => $email,
                'user_id' => $utilisateur->id,
                'steps_ms' => $metrics,
                'total_ms' => round((microtime(true) - $start) * 1000, 2),
            ]);
        }

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
        $user = auth()->user();

        if ($user) {
            ActivityLogger::log('LOGOUT', 'User logged out', $user->id);
        }

        auth()->logout();
    }

    public function refresh(): array
    {
        $token = auth()->refresh();
        $user = auth()->user();

        return $this->respondWithToken($token, $user);
    }

    public function me(): ?Utilisateur
    {
        return auth()->user();
    }

    public function changePassword(int $utilisateurId, string $currentPassword, string $newPassword): bool
    {
        $utilisateur = $this->utilisateurRepository->findOrFail($utilisateurId);

        if (! Hash::check($currentPassword, $utilisateur->password)) {
            return false;
        }

        return $this->utilisateurRepository->update($utilisateurId, [
            'password' => Hash::make($newPassword),
        ]);
    }

    public function updateProfile(array $data): Utilisateur
    {
        $user = JWTAuth::user();
        if (! $user) {
            throw new UserNotFoundException;
        }

        // Use repository to update
        $this->utilisateurRepository->update($user->id, $data);

        return $user->refresh();
    }

    protected function respondWithToken(string $token, Utilisateur $utilisateur): array
{
    $utilisateur = $this->utilisateurRepository->findOrFail($utilisateur->id);
    $utilisateur->load('competences');

    return [
        'access_token' => $token,
        'token_type' => 'bearer',
        'expires_in' => auth()->factory()->getTTL() * 60,
        'user' => $utilisateur,
    ];
}
}
