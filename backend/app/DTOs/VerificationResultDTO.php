<?php

namespace App\DTOs;

class VerificationResultDTO
{
    public function __construct(
        public readonly bool $success,
        public readonly string $message,
        public readonly ?array $data = null
    ) {
    }

    public static function success(string $message, ?array $data = null): self
    {
        return new self(true, $message, $data);
    }

    public static function failure(string $message): self
    {
        return new self(false, $message);
    }

    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'message' => $this->message,
            'data' => $this->data,
        ];
    }
}
