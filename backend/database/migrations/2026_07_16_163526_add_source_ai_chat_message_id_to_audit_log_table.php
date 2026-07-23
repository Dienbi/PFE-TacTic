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
        Schema::table('audit_log', function (Blueprint $table) {
            $table->uuid('source_ai_chat_message_id')->nullable()->after('details_json');
            $table->foreign('source_ai_chat_message_id')->references('id')->on('ai_chat_messages')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_log', function (Blueprint $table) {
            $table->dropForeign(['source_ai_chat_message_id']);
            $table->dropColumn('source_ai_chat_message_id');
        });
    }
};
