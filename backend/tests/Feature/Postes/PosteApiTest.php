<?php

namespace Tests\Feature\Postes;

use App\Enums\Role;
use App\Models\Poste;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class PosteApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_create_poste(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/postes', [
                'titre' => 'Software Engineer',
                'statut' => 'ACTIF',
                'description' => 'Backend development',
            ])
            ->assertCreated()
            ->assertJsonPath('titre', 'Software Engineer');

        $this->assertDatabaseHas('postes', [
            'titre' => 'Software Engineer',
            'statut' => 'ACTIF',
        ]);
    }

    /** @test */
    public function rh_can_update_poste(): void
    {
        $rh = $this->createTestRh();
        $poste = $this->createTestPoste(['titre' => 'Old Title']);

        $this
            ->actingAsApiUser($rh)
            ->putJson("/api/postes/{$poste->id}", [
                'titre' => 'New Title',
                'statut' => 'ACTIF',
            ])
            ->assertOk();

        $this->assertDatabaseHas('postes', [
            'id' => $poste->id,
            'titre' => 'New Title',
        ]);
    }

    /** @test */
    public function rh_can_delete_poste(): void
    {
        $rh = $this->createTestRh();
        $poste = $this->createTestPoste();

        $this
            ->actingAsApiUser($rh)
            ->deleteJson("/api/postes/{$poste->id}")
            ->assertOk();

        $this->assertDatabaseMissing('postes', ['id' => $poste->id]);
    }

    /** @test */
    public function employee_cannot_create_poste(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/postes', [
                'titre' => 'Blocked Position',
                'statut' => 'ACTIF',
            ])
            ->assertForbidden();

        $this->assertEquals(0, Poste::count());
    }

    /** @test */
    public function titre_is_required(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/postes', [
                'statut' => 'ACTIF',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['titre']);
    }
}
