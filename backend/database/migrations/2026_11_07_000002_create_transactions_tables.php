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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number', 40)->unique();
            $table->foreignId('cashier_id')->constrained('users')->restrictOnDelete();
            $table->decimal('subtotal', 10, 2)->unsigned();
            $table->enum('discount_type', ['none', 'fixed', 'percentage'])->default('none');
            $table->decimal('discount_value', 10, 2)->unsigned()->default(0.00);
            $table->decimal('discount_amount', 10, 2)->unsigned()->default(0.00);
            $table->decimal('total', 10, 2)->unsigned();
            $table->decimal('amount_paid', 10, 2)->unsigned();
            $table->decimal('change_amount', 10, 2)->unsigned()->default(0.00);
            $table->enum('payment_method', ['cash'])->default('cash');
            $table->enum('status', ['completed', 'voided'])->default('completed');
            $table->foreignId('voided_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('void_reason', 255)->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'status']);
            $table->index(['cashier_id', 'created_at']);
        });

        Schema::create('transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('product_name', 150);
            $table->string('unit', 30)->default('pc');
            $table->unsignedInteger('quantity');
            $table->decimal('price_at_sale', 10, 2)->unsigned();
            $table->decimal('line_total', 10, 2)->unsigned();
            $table->timestamps();

            $table->index('transaction_id');
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transaction_items');
        Schema::dropIfExists('transactions');
    }
};
