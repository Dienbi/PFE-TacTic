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
        Schema::table('employee_fiscal_profile_assignments', function (Blueprint $table) {
            $table->foreign('source_change_request_id')
                  ->references('id')
                  ->on('personal_info_change_requests')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_fiscal_profile_assignments', function (Blueprint $table) {
            $table->dropForeign(['source_change_request_id']);
        });
    }
};
