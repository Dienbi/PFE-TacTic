<?php

namespace App\Http\Controllers\Api;

use App\Events\NewAccountRequest;
use App\Http\Controllers\Controller;
use App\Models\AccountRequest;
use App\Models\Utilisateur;
use App\Mail\WelcomeNewUser;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AccountRequestController extends Controller
{
    /**
     * Submit a new account request (public route)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'personal_email' => 'required|email|unique:account_requests,personal_email',
        ]);

        $accountRequest = AccountRequest::create([
            'nom' => $request->nom,
            'prenom' => $request->prenom,
            'personal_email' => $request->personal_email,
            'status' => AccountRequest::STATUS_PENDING,
        ]);

        // Broadcast event for RH notification via Laravel Reverb
        $this->broadcastNewAccountRequest($accountRequest);

        return response()->json([
            'message' => 'Votre demande a été soumise avec succès. Vous recevrez un email lorsqu\'elle sera traitée.',
            'request_id' => $accountRequest->id,
        ], 201);
    }

    /**
     * Broadcast new account request event via Laravel Reverb
     */
    private function broadcastNewAccountRequest(AccountRequest $accountRequest): void
    {
        try {
            event(new NewAccountRequest([
                'id' => $accountRequest->id,
                'nom' => $accountRequest->nom,
                'prenom' => $accountRequest->prenom,
                'personal_email' => $accountRequest->personal_email,
                'created_at' => $accountRequest->created_at->toISOString(),
            ]));
        } catch (\Exception $e) {
            // Log error but don't fail the request
            Log::warning('Failed to broadcast new account request: ' . $e->getMessage());
        }
    }

    /**
     * Get all pending requests (RH only)
     */
    public function pending(): JsonResponse
    {
        $requests = Cache::remember('account_requests_pending', 300, fn() =>
            AccountRequest::pending()
                ->orderBy('created_at', 'desc')
                ->get()
        );

        return response()->json($requests);
    }

    /**
     * Get all requests (RH only)
     */
    public function index(): JsonResponse
    {
        $requests = AccountRequest::with('approver')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($requests);
    }

    /**
     * Get a single request (RH only)
     */
    public function show(int $id): JsonResponse
    {
        $request = AccountRequest::with('approver')->findOrFail($id);
        return response()->json($request);
    }

    /**
     * Approve an account request (RH only)
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $accountRequest = AccountRequest::findOrFail($id);

        if (!$accountRequest->isPending()) {
            return response()->json([
                'message' => 'Cette demande a déjà été traitée.',
            ], 400);
        }

        $request->validate([
            'role' => 'required|in:EMPLOYE,CHEF_EQUIPE,RH',
        ]);

        // Generate company email
        $generatedEmail = $accountRequest->generateEmail();

        // Check if email already exists, append number if needed
        $baseEmail = $generatedEmail;
        $counter = 1;
        while (Utilisateur::where('email', $generatedEmail)->exists()) {
            $generatedEmail = str_replace('@tactic.com', "{$counter}@tactic.com", $baseEmail);
            $counter++;
        }

        // Generate temporary token (valid for 48 hours)
        $tempToken = Str::random(64);

        // Update account request
        $accountRequest->update([
            'status' => AccountRequest::STATUS_APPROVED,
            'generated_email' => $generatedEmail,
            'temp_token' => $tempToken,
            'token_expires_at' => now()->addHours(48),
            'approved_by' => auth()->id(),
            'processed_at' => now(),
        ]);

        // Create the user account with a temporary random password
        $tempPassword = Str::random(32);
        $utilisateur = Utilisateur::create([
            'matricule' => $this->generateMatricule(),
            'nom' => $accountRequest->nom,
            'prenom' => $accountRequest->prenom,
            'email' => $generatedEmail,
            'password' => Hash::make($tempPassword),
            'role' => $request->role,
            'status' => 'DISPONIBLE',
            'actif' => true,
        ]);

        // Send welcome email with token link
        Mail::to($accountRequest->personal_email)->send(new WelcomeNewUser($accountRequest, $utilisateur));

        // Log the activity
        ActivityLogger::log(
            'USER_CREATED',
            "Compte créé pour {$utilisateur->prenom} {$utilisateur->nom} ({$generatedEmail}) avec le rôle {$request->role}"
        );

        Cache::forget('account_requests_pending');
        return response()->json([
            'message' => 'La demande a été approuvée. Un email a été envoyé à l\'utilisateur.',
            'generated_email' => $generatedEmail,
        ]);
    }

    /**
     * Reject an account request (RH only)
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $accountRequest = AccountRequest::findOrFail($id);

        if (!$accountRequest->isPending()) {
            return response()->json([
                'message' => 'Cette demande a déjà été traitée.',
            ], 400);
        }

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $accountRequest->update([
            'status' => AccountRequest::STATUS_REJECTED,
            'rejection_reason' => $request->reason,
            'approved_by' => auth()->id(),
            'processed_at' => now(),
        ]);

        // Log the activity
        ActivityLogger::log(
            'USER_REJECTED',
            "Demande de compte refusée pour {$accountRequest->prenom} {$accountRequest->nom}"
        );

        Cache::forget('account_requests_pending');
        return response()->json([
            'message' => 'La demande a été refusée.',
        ]);
    }

    /**
     * Validate token and get user info (public route for first login)
     */
    public function validateToken(string $token): JsonResponse
    {
        $accountRequest = AccountRequest::where('temp_token', $token)->first();

        if (!$accountRequest) {
            return response()->json([
                'message' => 'Token invalide.',
            ], 404);
        }

        if (!$accountRequest->isTokenValid()) {
            return response()->json([
                'message' => 'Ce lien a expiré ou a déjà été utilisé.',
            ], 400);
        }

        $user = Utilisateur::where('email', $accountRequest->generated_email)->first();

        return response()->json([
            'valid' => true,
            'user' => [
                'nom' => $accountRequest->nom,
                'prenom' => $accountRequest->prenom,
                'email' => $accountRequest->generated_email,
            ],
        ]);
    }

    /**
     * Set password using token (public route for first login)
     */
    public function setPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $accountRequest = AccountRequest::where('temp_token', $request->token)->first();

        if (!$accountRequest) {
            return response()->json([
                'message' => 'Token invalide.',
            ], 404);
        }

        if (!$accountRequest->isTokenValid()) {
            return response()->json([
                'message' => 'Ce lien a expiré ou a déjà été utilisé.',
            ], 400);
        }

        // Find and update the user
        $user = Utilisateur::where('email', $accountRequest->generated_email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur introuvable.',
            ], 404);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Mark token as used
        $accountRequest->update([
            'token_used' => true,
        ]);

        // Generate JWT token for automatic login
        $token = JWTAuth::fromUser($user);

        return response()->json([
            'message' => 'Mot de passe défini avec succès.',
            'token' => $token,
            'user' => $user,
        ]);
    }

    /**
     * Get count of pending requests (for notifications)
     */
    public function pendingCount(): JsonResponse
    {
        $count = AccountRequest::pending()->count();
        return response()->json(['count' => $count]);
    }

    /**
     * Generate unique matricule
     */
    private function generateMatricule(): string
    {
        $lastUser = Utilisateur::orderBy('id', 'desc')->first();
        $nextId = $lastUser ? $lastUser->id + 1 : 1;
        return 'EMP' . str_pad($nextId, 5, '0', STR_PAD_LEFT);
    }
}
