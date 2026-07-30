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
        Schema::table('children', function (Blueprint $table) {
            $table->boolean('verified')->default(false)->after('document_path');
            $table->timestamp('verified_at')->nullable()->after('verified');
            $table->boolean('rejected')->default(false)->after('verified_at');
            $table->timestamp('rejected_at')->nullable()->after('rejected');
            $table->text('rejection_reason')->nullable()->after('rejected_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('children', function (Blueprint $table) {
            $table->dropColumn(['verified', 'verified_at', 'rejected', 'rejected_at', 'rejection_reason']);
        });
    }
};
