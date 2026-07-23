<?php

namespace App\Repositories\FiscalProfile;

use App\Models\ChangeRequestDocument;
use Illuminate\Support\Str;

class ChangeRequestDocumentRepository
{
    public function create(array $data): ChangeRequestDocument
    {
        return ChangeRequestDocument::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            'change_request_id' => $data['change_request_id'],
            'document_type' => $data['document_type'],
            'file_path' => $data['file_path'],
            'uploaded_at' => $data['uploaded_at'] ?? now(),
            'verified_by_hr' => $data['verified_by_hr'] ?? false,
            'verified_by' => $data['verified_by'] ?? null,
            'verification_notes' => $data['verification_notes'] ?? null,
        ]);
    }

    public function findById(string $id): ?ChangeRequestDocument
    {
        return ChangeRequestDocument::with(['changeRequest', 'verifiedBy'])->find($id);
    }

    public function findByChangeRequest(string $changeRequestId): \Illuminate\Database\Eloquent\Collection
    {
        return ChangeRequestDocument::where('change_request_id', $changeRequestId)
            ->with(['verifiedBy'])
            ->get();
    }

    public function update(string $id, array $data): ChangeRequestDocument
    {
        $document = $this->findById($id);
        $document->update($data);
        return $document->fresh();
    }

    public function markVerified(string $id, int $verifiedBy, ?string $notes = null): ChangeRequestDocument
    {
        return $this->update($id, [
            'verified_by_hr' => true,
            'verified_by' => $verifiedBy,
            'verification_notes' => $notes,
        ]);
    }

    public function delete(string $id): bool
    {
        return ChangeRequestDocument::destroy($id);
    }

    public function deleteByChangeRequest(string $changeRequestId): int
    {
        return ChangeRequestDocument::where('change_request_id', $changeRequestId)->delete();
    }
}
