<?php

namespace App\Repositories;

use App\Contracts\Repositories\CongeRepositoryInterface;
use App\Enums\StatutConge;
use App\Enums\TypeConge;
use App\Models\Conge;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class CongeRepository extends BaseRepository implements CongeRepositoryInterface
{
    public function __construct(Conge $model)
    {
        parent::__construct($model);
    }

    public function getByUtilisateur(int $utilisateurId): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->orderBy('date_debut', 'desc')
            ->get();
    }

    public function getEnAttente(): Collection
    {
        return $this->model->enAttente()
            ->with('utilisateur')
            ->orderBy('created_at', 'asc')
            ->get();
    }

    public function getEnAttenteByEquipe(int $equipeId): Collection
    {
        return $this->model->enAttente()
            ->whereHas('utilisateur', function ($query) use ($equipeId) {
                $query->where('equipe_id', $equipeId);
            })
            ->with('utilisateur')
            ->orderBy('created_at', 'asc')
            ->get();
    }

    public function approuver(int $congeId, int $approuveParId): bool
    {
        return $this->update($congeId, [
            'statut' => StatutConge::APPROUVE,
            'approuve_par' => $approuveParId,
        ]);
    }

    public function refuser(int $congeId, int $approuveParId): bool
    {
        return $this->update($congeId, [
            'statut' => StatutConge::REFUSE,
            'approuve_par' => $approuveParId,
        ]);
    }

    public function getByPeriod(Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->model->byPeriod($startDate, $endDate)
            ->with('utilisateur')
            ->get();
    }

    public function getByType(TypeConge $type): Collection
    {
        return $this->model->byType($type)->get();
    }

    public function hasConflict(int $utilisateurId, Carbon $dateDebut, Carbon $dateFin, ?int $excludeId = null): bool
    {
        $query = $this->model->where('utilisateur_id', $utilisateurId)
            ->where('statut', '!=', StatutConge::REFUSE)
            ->where(function ($q) use ($dateDebut, $dateFin) {
                $q->whereBetween('date_debut', [$dateDebut, $dateFin])
                    ->orWhereBetween('date_fin', [$dateDebut, $dateFin])
                    ->orWhere(function ($q2) use ($dateDebut, $dateFin) {
                        $q2->where('date_debut', '<=', $dateDebut)
                           ->where('date_fin', '>=', $dateFin);
                    });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    public function getApprouvesByPeriod(int $utilisateurId, Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->model->where('utilisateur_id', $utilisateurId)
            ->approuve()
            ->byPeriod($startDate, $endDate)
            ->get();
    }
}
