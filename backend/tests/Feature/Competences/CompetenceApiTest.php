<?php

namespace Tests\Feature\Competences;

use App\Enums\Role;
use App\Models\Competence;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesApiUsers;
use Tests\TestCase;
use Tests\TestHelpers;

class CompetenceApiTest extends TestCase
{
    use AuthenticatesApiUsers;
    use RefreshDatabase;
    use TestHelpers;

    /** @test */
    public function rh_can_create_competence(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/competences', [
                'nom' => 'PHP',
                'niveau' => 4,
            ])
            ->assertCreated()
            ->assertJsonPath('nom', 'PHP');

        $this->assertDatabaseHas('competences', ['nom' => 'PHP']);
    }

    /** @test */
    public function rh_can_update_competence(): void
    {
        $rh = $this->createTestRh();
        $competence = $this->createTestCompetence(['nom' => 'Old Skill']);

        $this
            ->actingAsApiUser($rh)
            ->putJson("/api/competences/{$competence->id}", [
                'nom' => 'Updated Skill',
                'niveau' => 5,
            ])
            ->assertOk();

        $this->assertDatabaseHas('competences', [
            'id' => $competence->id,
            'nom' => 'Updated Skill',
        ]);
    }

    /** @test */
    public function rh_can_delete_competence(): void
    {
        $rh = $this->createTestRh();
        $competence = $this->createTestCompetence();

        $this
            ->actingAsApiUser($rh)
            ->deleteJson("/api/competences/{$competence->id}")
            ->assertOk();

        $this->assertDatabaseMissing('competences', ['id' => $competence->id]);
    }

    /** @test */
    public function employee_cannot_manage_competences(): void
    {
        $employee = $this->createTestUser(['role' => Role::EMPLOYE]);

        $this
            ->actingAsApiUser($employee)
            ->postJson('/api/competences', ['nom' => 'Blocked Skill'])
            ->assertForbidden();

        $this->assertEquals(0, Competence::count());
    }

    /** @test */
    public function nom_is_required(): void
    {
        $rh = $this->createTestRh();

        $this
            ->actingAsApiUser($rh)
            ->postJson('/api/competences', ['niveau' => 3])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nom']);
    }
}
