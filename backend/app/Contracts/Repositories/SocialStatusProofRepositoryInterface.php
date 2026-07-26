<?php

namespace App\Contracts\Repositories;

use Illuminate\Database\Eloquent\Collection;

interface SocialStatusProofRepositoryInterface
{
    public function getByUtilisateur(int $utilisateurId): Collection;

    public function createForUtilisateur(int $utilisateurId, array $data): \App\Models\SocialStatusProof;

    public function verifyProof(int $proofId): bool;

    public function getLatestByUtilisateur(int $utilisateurId): ?\App\Models\SocialStatusProof;
}
