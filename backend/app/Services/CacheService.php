<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Centralized caching service with TTL management
 * Provides consistent cache keys and invalidation strategies
 */
class CacheService
{
    // Cache key prefixes
    const PREFIX_ACTIVE_USERS = 'active_users';
    const PREFIX_USER_PERMISSIONS = 'user_permissions';
    const PREFIX_USER = 'user';
    const PREFIX_PAYROLL_STATS = 'payroll_stats';
    const PREFIX_COMPETENCES = 'competences';
    const PREFIX_TEAMS = 'teams';
    const PREFIX_TEAM_MEMBERS = 'team_members';

    // Cache TTLs in seconds
    const TTL_ACTIVE_USERS = 300; // 5 minutes
    const TTL_USER_PERMISSIONS = 3600; // 1 hour
    const TTL_USER_DATA = 1800; // 30 minutes
    const TTL_STATISTICS = 3600; // 1 hour
    const TTL_REFERENCE_DATA = 86400; // 1 day

    /**
     * Get cached active users list
     */
    public function getActiveUsers(callable $callback): mixed
    {
        return Cache::remember(
            self::PREFIX_ACTIVE_USERS,
            self::TTL_ACTIVE_USERS,
            $callback
        );
    }

    /**
     * Get cached user permissions
     */
    public function getUserPermissions(int $userId, callable $callback): mixed
    {
        $key = $this->buildKey(self::PREFIX_USER_PERMISSIONS, $userId);
        return Cache::remember($key, self::TTL_USER_PERMISSIONS, $callback);
    }

    /**
     * Get cached user data
     */
    public function getUser(int $userId, callable $callback): mixed
    {
        $key = $this->buildKey(self::PREFIX_USER, $userId);
        return Cache::remember($key, self::TTL_USER_DATA, $callback);
    }

    /**
     * Get cached payroll statistics
     */
    public function getPayrollStats(callable $callback): mixed
    {
        return Cache::remember(
            self::PREFIX_PAYROLL_STATS,
            self::TTL_STATISTICS,
            $callback
        );
    }

    /**
     * Get cached competences list
     */
    public function getCompetences(callable $callback): mixed
    {
        return Cache::remember(
            self::PREFIX_COMPETENCES,
            self::TTL_REFERENCE_DATA,
            $callback
        );
    }

    /**
     * Get cached teams list
     */
    public function getTeams(callable $callback): mixed
    {
        return Cache::remember(
            self::PREFIX_TEAMS,
            self::TTL_REFERENCE_DATA,
            $callback
        );
    }

    /**
     * Get cached team members
     */
    public function getTeamMembers(int $teamId, callable $callback): mixed
    {
        $key = $this->buildKey(self::PREFIX_TEAM_MEMBERS, $teamId);
        return Cache::remember($key, self::TTL_REFERENCE_DATA, $callback);
    }

    /**
     * Invalidate active users cache
     */
    public function invalidateActiveUsers(): void
    {
        Cache::forget(self::PREFIX_ACTIVE_USERS);
    }

    /**
     * Invalidate user-specific caches
     */
    public function invalidateUser(int $userId): void
    {
        Cache::forget($this->buildKey(self::PREFIX_USER, $userId));
        Cache::forget($this->buildKey(self::PREFIX_USER_PERMISSIONS, $userId));
    }

    /**
     * Invalidate payroll statistics cache
     */
    public function invalidatePayrollStats(): void
    {
        Cache::forget(self::PREFIX_PAYROLL_STATS);
    }

    /**
     * Invalidate competences cache
     */
    public function invalidateCompetences(): void
    {
        Cache::forget(self::PREFIX_COMPETENCES);
    }

    /**
     * Invalidate teams cache
     */
    public function invalidateTeams(): void
    {
        Cache::forget(self::PREFIX_TEAMS);
    }

    /**
     * Invalidate team members cache
     */
    public function invalidateTeamMembers(int $teamId): void
    {
        Cache::forget($this->buildKey(self::PREFIX_TEAM_MEMBERS, $teamId));
    }

    /**
     * Invalidate all team-related caches
     */
    public function invalidateAllTeams(): void
    {
        Cache::forget(self::PREFIX_TEAMS);
        // Note: For team members, we'd need cache tagging or a registry
        // For now, we flush teams list which is the most critical
    }

    /**
     * Build a cache key with prefix and identifier
     */
    private function buildKey(string $prefix, int|string $identifier): string
    {
        return "{$prefix}:{$identifier}";
    }

    /**
     * Clear all application caches (use with caution)
     */
    public function clearAll(): void
    {
        Cache::flush();
    }

    /**
     * Generic cache method with custom key and TTL
     */
    public function remember(string $key, int $ttl, callable $callback): mixed
    {
        return Cache::remember($key, $ttl, $callback);
    }

    /**
     * Generic cache forget method
     */
    public function forget(string $key): void
    {
        Cache::forget($key);
    }
}
