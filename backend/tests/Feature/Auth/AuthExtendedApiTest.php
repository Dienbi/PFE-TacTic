<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class AuthExtendedApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function authenticated_user_can_refresh_token(): void
    {
        $user = $this->createTestUser(['email' => 'refresh@tactic.test']);

        $this
            ->actingAsApiUser($user)
            ->postJson('/api/auth/refresh')
            ->assertOk()
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'expires_in',
            ]);
    }

    /** @test */
    public function change_password_requires_valid_current_password(): void
    {
        $user = $this->createTestUser(['email' => 'changepw@tactic.test']);

        $this
            ->actingAsApiUser($user)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'wrong-password',
                'new_password' => 'newpassword123',
                'new_password_confirmation' => 'newpassword123',
            ])
            ->assertStatus(400)
            ->assertJsonPath('message', 'Mot de passe actuel incorrect.');
    }

    /** @test */
    public function change_password_requires_confirmation(): void
    {
        $user = $this->createTestUser(['email' => 'changepw2@tactic.test']);

        $this
            ->actingAsApiUser($user)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'password',
                'new_password' => 'newpassword123',
                'new_password_confirmation' => 'different',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['new_password']);
    }
}
