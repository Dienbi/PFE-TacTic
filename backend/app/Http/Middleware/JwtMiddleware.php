<?php

namespace App\Http\Middleware;

use App\Models\Utilisateur;
use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            /** @var Utilisateur|null $user */
            $user = JWTAuth::user();

            if (! $user) {
                return response()->json([
                    'message' => 'Utilisateur non trouvé.',
                ], 404);
            }

            if (! $user->actif) {
                return response()->json([
                    'message' => 'Compte désactivé.',
                ], 403);
            }

        } catch (TokenExpiredException $e) {
            return response()->json([
                'message' => 'Token expiré.',
            ], 401);
        } catch (TokenInvalidException $e) {
            return response()->json([
                'message' => 'Token invalide.',
            ], 401);
        } catch (JWTException $e) {
            return response()->json([
                'message' => 'Token manquant.',
            ], 401);
        }

        return $next($request);
    }
}
