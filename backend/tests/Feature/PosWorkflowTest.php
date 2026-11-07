<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PosWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashier;
    private Product $productA;
    private Product $productB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'username' => 'admin',
            'full_name' => 'Marilou (Owner)',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'username' => 'cashier',
            'full_name' => 'Charlene (Cashier)',
            'password' => Hash::make('cashier123'),
            'role' => 'cashier',
            'is_active' => true,
        ]);

        $this->productA = Product::create([
            'name' => 'Lucky Me Pancit Canton',
            'barcode' => '4807770270017',
            'category' => 'Instant Noodles',
            'unit' => 'pack',
            'price' => 16.00,
            'stock_quantity' => 10,
        ]);

        $this->productB = Product::create([
            'name' => 'Argentina Corned Beef',
            'barcode' => '4800194111157',
            'category' => 'Canned Goods',
            'unit' => 'can',
            'price' => 42.00,
            'stock_quantity' => 5,
        ]);
    }

    public function test_login_succeeds_for_active_user_and_blocks_inactive_or_wrong_password(): void
    {
        // Valid login
        $res = $this->postJson('/api/login', [
            'username' => 'admin',
            'password' => 'admin123',
        ]);
        $res->assertStatus(200)->assertJsonPath('user.username', 'admin');

        // Wrong password
        $this->postJson('/api/login', [
            'username' => 'admin',
            'password' => 'wrongpass',
        ])->assertStatus(401);

        // Deactivated user
        $this->cashier->update(['is_active' => false]);
        $this->postJson('/api/login', [
            'username' => 'cashier',
            'password' => 'cashier123',
        ])->assertStatus(403);
    }

    public function test_role_permissions_block_cashier_from_admin_endpoints(): void
    {
        $this->actingAs($this->cashier, 'sanctum');

        // Cashier can view products
        $this->getJson('/api/products')->assertStatus(200);

        // Cashier cannot manage users, products, or view full reports
        $this->getJson('/api/users')->assertStatus(403);
        $this->postJson('/api/products', [
            'name' => 'New Item',
            'category' => 'Snacks',
            'price' => 10,
            'stock_quantity' => 5,
        ])->assertStatus(403);
        $this->getJson('/api/reports/sales')->assertStatus(403);
    }

    public function test_checkout_calculates_totals_and_discounts_and_deducts_stock_atomically(): void
    {
        $this->actingAs($this->cashier, 'sanctum');

        // 2x16.00 (32.00) + 1x42.00 (42.00) = Subtotal 74.00
        // Fixed discount 4.00 => Total 70.00
        // Paid 100.00 => Change 30.00
        $res = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2],
                ['product_id' => $this->productB->id, 'quantity' => 1],
            ],
            'discount_type' => 'fixed',
            'discount_value' => 4.00,
            'amount_paid' => 100.00,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('transaction.subtotal', '74.00')
            ->assertJsonPath('transaction.discount_amount', '4.00')
            ->assertJsonPath('transaction.total', '70.00')
            ->assertJsonPath('transaction.change_amount', '30.00');

        $this->assertEquals(8, $this->productA->fresh()->stock_quantity);
        $this->assertEquals(4, $this->productB->fresh()->stock_quantity);
    }

    public function test_checkout_blocks_insufficient_stock_and_insufficient_payment_without_deducting_stock(): void
    {
        $this->actingAs($this->cashier, 'sanctum');

        // Request 15 when stock is 10
        $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 15],
            ],
            'discount_type' => 'none',
            'discount_value' => 0,
            'amount_paid' => 500.00,
        ])->assertStatus(422);

        // Stock must remain untouched
        $this->assertEquals(10, $this->productA->fresh()->stock_quantity);

        // Insufficient payment
        $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2],
            ],
            'discount_type' => 'none',
            'discount_value' => 0,
            'amount_paid' => 20.00, // Total is 32.00
        ])->assertStatus(422);

        $this->assertEquals(10, $this->productA->fresh()->stock_quantity);
    }

    public function test_product_deletion_archives_product_and_preserves_transaction_history_and_price_at_sale(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        // Complete a sale of productA at ₱16.00
        $saleRes = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 1],
            ],
            'discount_type' => 'none',
            'discount_value' => 0,
            'amount_paid' => 20.00,
        ])->assertStatus(201);

        $txId = $saleRes->json('transaction.id');

        // Change price of productA to ₱20.00 and then delete/archive it
        $this->putJson("/api/products/{$this->productA->id}", [
            'name' => $this->productA->name,
            'category' => $this->productA->category,
            'unit' => $this->productA->unit,
            'price' => 20.00,
            'stock_quantity' => 9,
        ])->assertStatus(200);

        $this->deleteJson("/api/products/{$this->productA->id}")
            ->assertStatus(200)
            ->assertJsonPath('archived_with_history', true);

        // Product should no longer appear in active product catalog
        $catalog = $this->getJson('/api/products')->json('products');
        $this->assertCount(1, $catalog);

        // Past transaction receipt must still exist with historical price ₱16.00
        $receipt = $this->getJson("/api/transactions/{$txId}")->assertStatus(200);
        $this->assertEquals('16.00', $receipt->json('transaction.items.0.price_at_sale'));
    }

    public function test_admin_can_void_mistaken_transaction_and_restore_stock(): void
    {
        $this->actingAs($this->cashier, 'sanctum');

        $saleRes = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $this->productB->id, 'quantity' => 2],
            ],
            'discount_type' => 'none',
            'discount_value' => 0,
            'amount_paid' => 100.00,
        ])->assertStatus(201);

        $txId = $saleRes->json('transaction.id');
        $this->assertEquals(3, $this->productB->fresh()->stock_quantity);

        // Cashier cannot void
        $this->postJson("/api/transactions/{$txId}/void", [
            'void_reason' => 'Mistake',
        ])->assertStatus(403);

        // Admin can void and stock is restored back to 5
        $this->actingAs($this->admin, 'sanctum');
        $this->postJson("/api/transactions/{$txId}/void", [
            'void_reason' => 'Wrong item punched by cashier',
        ])->assertStatus(200)
          ->assertJsonPath('transaction.status', 'voided');

        $this->assertEquals(5, $this->productB->fresh()->stock_quantity);
    }

    public function test_cashier_history_shows_only_own_transactions_while_admin_sees_all_and_reports(): void
    {
        // Cashier makes a sale of ₱16.00
        $this->actingAs($this->cashier, 'sanctum');
        $this->postJson('/api/transactions', [
            'items' => [['product_id' => $this->productA->id, 'quantity' => 1]],
            'discount_type' => 'none',
            'discount_value' => 0,
            'amount_paid' => 20.00,
        ])->assertStatus(201);

        // Admin makes a sale of ₱42.00
        $this->actingAs($this->admin, 'sanctum');
        $this->postJson('/api/transactions', [
            'items' => [['product_id' => $this->productB->id, 'quantity' => 1]],
            'discount_type' => 'none',
            'discount_value' => 0,
            'amount_paid' => 50.00,
        ])->assertStatus(201);

        // Cashier history should only return 1 transaction
        $this->actingAs($this->cashier, 'sanctum');
        $cashierHistory = $this->getJson('/api/transactions')->assertStatus(200)->json('transactions');
        $this->assertCount(1, $cashierHistory);

        // Admin history returns both transactions (2)
        $this->actingAs($this->admin, 'sanctum');
        $adminHistory = $this->getJson('/api/transactions')->assertStatus(200)->json('transactions');
        $this->assertCount(2, $adminHistory);

        // Admin daily sales report equals 16 + 42 = 58.00
        $report = $this->getJson('/api/reports/sales?period=day')->assertStatus(200);
        $this->assertEquals(58.00, $report->json('summary.total_sales'));
        $this->assertEquals(2, $report->json('summary.transaction_count'));
    }

    public function test_admin_can_register_and_manage_users_with_duplicate_username_validation(): void
    {
        $this->actingAs($this->admin, 'sanctum');

        $this->postJson('/api/users', [
            'username' => 'newcashier',
            'full_name' => 'Lurdinand Luena',
            'password' => 'secret123',
            'role' => 'cashier',
        ])->assertStatus(201);

        // Duplicate username rejected
        $this->postJson('/api/users', [
            'username' => 'newcashier',
            'full_name' => 'Another User',
            'password' => 'secret123',
            'role' => 'cashier',
        ])->assertStatus(422);
    }
}
