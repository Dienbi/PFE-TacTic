<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class AuthApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function user_can_login_and_fetch_current_profile(): void
    {
        $user = $this->createTestUser([
            'email' => 'employee@tactic.test',
            'role' => Role::EMPLOYE,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'expires_in',
                'user' => [
                    'id',
                    'nom',
                    'prenom',
                    'email',
                    'matricule',
                    'role',
                ],
            ])
            ->assertJsonPath('token_type', 'bearer')
            ->assertJsonPath('user.email', 'employee@tactic.test');

        $token = $loginResponse->json('access_token');

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', 'employee@tactic.test');
    }

    /** @test */
    public function inactive_user_cannot_login(): void
    {
        $user = $this->createTestUser([
            'email' => 'inactive@tactic.test',
            'actif' => false,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertUnauthorized()
            ->assertJsonStructure(['message']);
    }

    /** @test */
    public function authenticated_user_can_logout(): void
    {
        $user = Utilisateur::factory()->create();

        $this
            ->actingAsApiUser($user)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonStructure(['message']);
    }
}
