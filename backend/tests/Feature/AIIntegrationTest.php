<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;
use Tests\TestHelpers;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AIIntegrationTest extends TestCase
{
    use RefreshDatabase, TestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        // Setup default AI service mock
        Http::fake([
            '*/health' => Http::response(['status' => 'healthy', 'service' => 'TacTic AI Service'], 200),
        ]);
    }

    /**
     * Test health check proxy
     */
    public function test_ai_health_proxy(): void
    {
        $user = $this->createTestUser();
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/ai/health');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'healthy');
    }

    /**
     * Test job matching proxy (RH only)
     */
    public function test_ai_match_proxy(): void
    {
        $rhUser = $this->createTestUser(['role' => Role::RH]);
        $token = JWTAuth::fromUser($rhUser);

        Http::fake([
            '*/api/match' => Http::response([
                'job_post_id' => 1,
                'job_post_titre' => 'Test Position',
                'total_candidates' => 1,
                'recommendations' => [
                    [
                        'utilisateur_id' => 10,
                        'nom' => 'Doe',
                        'prenom' => 'John',
                        'matricule' => 'EMP10',
                        'email' => 'john@example.com',
                        'score' => 85.5,
                        'details' => []
                    ]
                ]
            ], 200),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/ai/match/1');

        $response->assertStatus(200)
            ->assertJsonPath('total_candidates', 1)
            ->assertJsonPath('recommendations.0.nom', 'Doe');
    }

    /**
     * Test training trigger (RH only)
     */
    public function test_ai_train_proxy(): void
    {
        $rhUser = $this->createTestUser(['role' => Role::RH]);
        $token = JWTAuth::fromUser($rhUser);

        Http::fake([
            '*/api/train/*' => Http::response([
                'status' => 'started',
                'message' => 'Training started in background',
                'model' => 'attendance'
            ], 200),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/ai/train/attendance');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'started');
    }

    /**
     * Test that non-RH users cannot trigger training
     */
    public function test_ai_train_forbidden_for_non_rh(): void
    {
        $user = $this->createTestUser(['role' => Role::EMPLOYE]);
        $token = JWTAuth::fromUser($user);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/ai/train/attendance');

        $response->assertStatus(403);
    }
}
