<?php

namespace App\Repositories;

use App\Models\CvUpload;
use Illuminate\Database\Eloquent\Collection;

class CvUploadRepository extends BaseRepository
{
    public function __construct(CvUpload $model)
    {
        parent::__construct($model);
    }

    public function createCvUpload(int $userId, string $filePath, string $filename): CvUpload
    {
        return $this->model->create([
            'utilisateur_id' => $userId,
            'file_path' => $filePath,
            'original_filename' => $filename,
            'status' => 'pending',
        ]);
    }

    public function updateStatus(int $id, string $status, ?array $extractedData = null, ?string $error = null): bool
    {
        $record = $this->findOrFail($id);
        $data = ['status' => $status];

        if ($extractedData !== null) {
            $data['extracted_data'] = $extractedData;
        }

        if ($error !== null) {
            $data['error_message'] = $error;
        }

        return $record->update($data);
    }

    public function getByUserId(int $userId): ?CvUpload
    {
        return $this->model->byUser($userId)->with('utilisateur')->latest()->first();
    }

    public function getPendingJobs(): Collection
    {
        return $this->model->pending()->get();
    }
}
