<?php

namespace App\Repositories;

use App\Models\Affectation;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class AffectationRepository extends BaseRepository
{
    public function __construct(Affectation $model)
    {
        parent::__construct($model);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->with('poste')
            ->orderBy('date_debut', 'desc')
            ->get();
    }

    public function getByPoste(int $posteId): Collection
    {
        return $this->model->where('poste_id', $posteId)
            ->with('utilisateur')
            ->orderBy('date_debut', 'desc')
            ->get();
    }

    public function getActives(): Collection
    {
        return $this->model->actif()
            ->with(['utilisateur', 'poste'])
            ->get();
    }

    public function getActiveByUtilisateur(int $utilisateurId): ?Affectation
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->actif()
            ->with('poste')
            ->first();
    }

    public function terminer(int $affectationId, ?Carbon $dateFin = null): bool
    {
        return $this->update($affectationId, [
            'date_fin' => $dateFin ?? Carbon::now(),
        ]);
    }

    public function hasActiveAffectation(int $utilisateurId): bool
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->actif()
            ->exists();
    }
}
