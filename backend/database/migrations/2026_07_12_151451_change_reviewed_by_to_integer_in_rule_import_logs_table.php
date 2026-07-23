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
        DB::statement('ALTER TABLE rule_import_logs DROP COLUMN IF EXISTS reviewed_by');
        Schema::table('rule_import_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('reviewed_by')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rule_import_logs', function (Blueprint $table) {
            $table->dropColumn('reviewed_by');
            $table->uuid('reviewed_by')->nullable();
        });
    }
};
