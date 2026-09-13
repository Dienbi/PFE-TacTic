<?php

namespace App\Jobs;

use App\Services\CvExtractionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessCvUploadJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;
    public int $timeout = 300; // 5 minutes

    public function __construct(
        public int $cvUploadId
    ) {
        $this->onQueue('cv-extraction');
    }

    public function handle(CvExtractionService $cvExtractionService): void
    {
        try {
            $cvExtractionService->processCvUpload($this->cvUploadId);
        } catch (\Exception $e) {
            Log::error("ProcessCvUploadJob failed for CV upload ID {$this->cvUploadId}: ".$e->getMessage());

            if ($this->attempts() >= $this->tries) {
                Log::error("ProcessCvUploadJob exhausted retries for CV upload ID {$this->cvUploadId}");
            }

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("ProcessCvUploadJob permanently failed for CV upload ID {$this->cvUploadId}: ".$exception->getMessage());
    }
}
