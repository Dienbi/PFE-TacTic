<?php

namespace Tests\Feature\Concerns;

use App\Models\Utilisateur;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

trait AuthenticatesApiUsers
{
    protected function bearerTokenFor(Utilisateur $user): string
    {
        return 'Bearer ' . JWTAuth::fromUser($user);
    }

    protected function actingAsApiUser(Utilisateur $user): self
    {
        return $this->withHeader('Authorization', $this->bearerTokenFor($user));
    }
}
