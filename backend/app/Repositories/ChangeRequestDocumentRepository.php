<?php

namespace App\Repositories;

use App\Models\ChangeRequestDocument;
use Illuminate\Database\Eloquent\Collection;

class ChangeRequestDocumentRepository extends BaseRepository
{
    public function __construct(ChangeRequestDocument $model)
    {
        parent::__construct($model);
    }

    public function getByChangeRequest(string $changeRequestId): Collection
    {
        return $this->model->where('change_request_id', $changeRequestId)
            ->with('verifiedBy:id,nom,prenom')
            ->get();
    }

    public function verifyDocument(string $id, int $verifiedBy, ?string $notes = null): bool
    {
        return $this->update($id, [
            'verified_by_hr' => true,
            'verified_by' => $verifiedBy,
            'verification_notes' => $notes,
        ]);
    }

    public function getUnverifiedByChangeRequest(string $changeRequestId): Collection
    {
        return $this->model->where('change_request_id', $changeRequestId)
            ->unverified()
            ->get();
    }

    public function getVerifiedByChangeRequest(string $changeRequestId): Collection
    {
        return $this->model->where('change_request_id', $changeRequestId)
            ->verified()
            ->get();
    }

    public function getByType(string $changeRequestId, string $documentType): ?ChangeRequestDocument
    {
        return $this->model->where('change_request_id', $changeRequestId)
            ->where('document_type', $documentType)
            ->first();
    }
}
