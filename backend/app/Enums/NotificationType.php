<?php

namespace App\Enums;

enum NotificationType: string
{
    case SOCIAL_STATUS_APPROVED = 'social_status_approved';
    case SOCIAL_STATUS_REJECTED = 'social_status_rejected';
    case CHILD_APPROVED = 'child_approved';
    case CHILD_REJECTED = 'child_rejected';
    case FISCAL_PROFILE_REASSIGNED = 'fiscal_profile_reassigned';

    public function label(): string
    {
        return match ($this) {
            self::SOCIAL_STATUS_APPROVED => 'Social Status Approved',
            self::SOCIAL_STATUS_REJECTED => 'Social Status Rejected',
            self::CHILD_APPROVED => 'Child Approved',
            self::CHILD_REJECTED => 'Child Rejected',
            self::FISCAL_PROFILE_REASSIGNED => 'Fiscal Profile Reassigned',
        };
    }
}
