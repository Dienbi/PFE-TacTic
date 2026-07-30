<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Use raw SQL to drop the foreign key constraint if it exists (only in pgsql/mysql, sqlite doesn't support DROP CONSTRAINT)
        if (config('database.default') !== 'sqlite') {
            DB::statement('ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_foreign');
        }
        
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['actor_id']);
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn('actor_id');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->foreignId('actor_id')->nullable()->after('id');
            $table->foreign('actor_id')->references('id')->on('utilisateurs')->onDelete('set null');
            $table->index('actor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropForeign(['actor_id']);
            $table->dropIndex(['actor_id']);
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn('actor_id');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->uuid('actor_id')->nullable()->after('id');
            $table->foreign('actor_id')->references('id')->on('utilisateurs')->onDelete('set null');
            $table->index('actor_id');
        });
    }
};
