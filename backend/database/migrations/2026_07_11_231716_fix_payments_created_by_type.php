<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->after('reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->uuid('created_by')->nullable()->after('reference');
        });
    }
};
