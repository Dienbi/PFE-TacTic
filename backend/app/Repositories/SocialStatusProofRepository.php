<?php

namespace App\Repositories;

use App\Contracts\Repositories\SocialStatusProofRepositoryInterface;
use App\Models\SocialStatusProof;
use Illuminate\Database\Eloquent\Collection;

class SocialStatusProofRepository extends BaseRepository implements SocialStatusProofRepositoryInterface
{
    public function __construct(SocialStatusProof $model)
    {
        parent::__construct($model);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function createForUtilisateur(int $utilisateurId, array $data): SocialStatusProof
    {
        return $this->model->create(array_merge($data, ['utilisateur_id' => $utilisateurId]));
    }

    public function verifyProof(int $proofId): bool
    {
        return $this->update($proofId, [
            'verified' => true,
            'verified_at' => now(),
        ]);
    }

    public function getLatestByUtilisateur(int $utilisateurId): ?SocialStatusProof
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->orderBy('created_at', 'desc')
            ->first();
    }
}
