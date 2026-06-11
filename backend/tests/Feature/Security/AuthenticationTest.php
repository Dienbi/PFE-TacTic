<?php

namespace Tests\Feature\Security;

use App\Enums\TypeConge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
use Tests\TestHelpers;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function guest_cannot_access_protected_routes(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();

        $this->postJson('/api/conges', [
            'type' => TypeConge::ANNUEL->value,
            'date_debut' => Carbon::tomorrow()->toDateString(),
            'date_fin' => Carbon::tomorrow()->addDays(2)->toDateString(),
        ])->assertUnauthorized();

        $this->postJson('/api/paies/generer', [
            'utilisateur_id' => 1,
            'periode_debut' => '2026-01-01',
            'periode_fin' => '2026-01-31',
        ])->assertUnauthorized();
    }

    /** @test */
    public function invalid_token_returns_401(): void
    {
        $this
            ->withHeader('Authorization', 'Bearer not.a.valid.jwt')
            ->getJson('/api/auth/me')
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    }

    /** @test */
    public function archived_user_cannot_login(): void
    {
        $user = $this->createTestUser([
            'email' => 'archived@tactic.test',
            'actif' => false,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    }
}
