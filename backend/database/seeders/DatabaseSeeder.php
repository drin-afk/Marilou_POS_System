<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Default Users
        $admin = User::updateOrCreate(
            ['username' => 'admin'],
            [
                'full_name' => 'Marilou (Store Owner)',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        $cashier = User::updateOrCreate(
            ['username' => 'cashier'],
            [
                'full_name' => 'Charlene Palmero (Cashier)',
                'password' => Hash::make('cashier123'),
                'role' => 'cashier',
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['username' => 'lurdinand'],
            [
                'full_name' => 'Lurdinand Luena (Cashier)',
                'password' => Hash::make('cashier123'),
                'role' => 'cashier',
                'is_active' => true,
            ]
        );

        // 2. Realistic Philippine Sari-Sari Store Products
        $productsData = [
            // Instant Noodles & Canned Goods
            ['name' => 'Lucky Me! Pancit Canton Chilimansi', 'barcode' => '4807770270017', 'category' => 'Instant Noodles', 'unit' => 'pack', 'price' => 16.00, 'stock_quantity' => 50],
            ['name' => 'Lucky Me! Pancit Canton Calamansi', 'barcode' => '4807770270024', 'category' => 'Instant Noodles', 'unit' => 'pack', 'price' => 16.00, 'stock_quantity' => 45],
            ['name' => 'Lucky Me! Beef na Beef Mami', 'barcode' => '4807770270109', 'category' => 'Instant Noodles', 'unit' => 'pack', 'price' => 12.00, 'stock_quantity' => 40],
            ['name' => 'Argentina Corned Beef 150g', 'barcode' => '4800194111157', 'category' => 'Canned Goods', 'unit' => 'can', 'price' => 42.00, 'stock_quantity' => 30],
            ['name' => '555 Sardines in Tomato Sauce 155g', 'barcode' => '4800194122153', 'category' => 'Canned Goods', 'unit' => 'can', 'price' => 25.00, 'stock_quantity' => 35],
            ['name' => 'Mega Sardines Green 155g', 'barcode' => '4806504710018', 'category' => 'Canned Goods', 'unit' => 'can', 'price' => 26.00, 'stock_quantity' => 28],
            ['name' => 'Century Tuna Flakes in Oil 155g', 'barcode' => '4800194133159', 'category' => 'Canned Goods', 'unit' => 'can', 'price' => 38.00, 'stock_quantity' => 24],

            // Beverages & Coffee/Milk Sachets
            ['name' => 'Nescafe Original Twin Pack', 'barcode' => '4800361390804', 'category' => 'Coffee & Milk', 'unit' => 'sachet', 'price' => 15.00, 'stock_quantity' => 60],
            ['name' => 'Kopiko Blanca Twin Pack', 'barcode' => '8996001410011', 'category' => 'Coffee & Milk', 'unit' => 'sachet', 'price' => 15.00, 'stock_quantity' => 55],
            ['name' => 'Bear Brand Fortified Powdered Milk Swak 33g', 'barcode' => '4800361390903', 'category' => 'Coffee & Milk', 'unit' => 'sachet', 'price' => 14.00, 'stock_quantity' => 48],
            ['name' => 'Milo Activ-Go Sachet 24g', 'barcode' => '4800361391009', 'category' => 'Coffee & Milk', 'unit' => 'sachet', 'price' => 11.00, 'stock_quantity' => 52],
            ['name' => 'Coca-Cola Mismo 290ml', 'barcode' => '4801981110018', 'category' => 'Drinks & Beverages', 'unit' => 'bottle', 'price' => 22.00, 'stock_quantity' => 36],
            ['name' => 'Sprite Mismo 290ml', 'barcode' => '4801981110025', 'category' => 'Drinks & Beverages', 'unit' => 'bottle', 'price' => 22.00, 'stock_quantity' => 24],
            ['name' => 'Nature\'s Spring Purified Water 500ml', 'barcode' => '4806503840013', 'category' => 'Drinks & Beverages', 'unit' => 'bottle', 'price' => 15.00, 'stock_quantity' => 40],
            ['name' => 'Tang Orange Powdered Juice 19g', 'barcode' => '7622210110015', 'category' => 'Drinks & Beverages', 'unit' => 'sachet', 'price' => 20.00, 'stock_quantity' => 30],

            // Condiments & Cooking Essentials
            ['name' => 'Datu Puti Soy Sauce 200ml', 'barcode' => '4800488010012', 'category' => 'Condiments & Cooking', 'unit' => 'pouch', 'price' => 13.00, 'stock_quantity' => 25],
            ['name' => 'Datu Puti Vinegar 200ml', 'barcode' => '4800488010029', 'category' => 'Condiments & Cooking', 'unit' => 'pouch', 'price' => 12.00, 'stock_quantity' => 25],
            ['name' => 'Magic Sarap Granules 8g', 'barcode' => '4800361392006', 'category' => 'Condiments & Cooking', 'unit' => 'sachet', 'price' => 6.00, 'stock_quantity' => 100],
            ['name' => 'UFC Banana Catsup 320g', 'barcode' => '4800488010036', 'category' => 'Condiments & Cooking', 'unit' => 'bottle', 'price' => 32.00, 'stock_quantity' => 18],
            ['name' => 'Fresh Chicken Egg (Medium)', 'barcode' => '2000000000011', 'category' => 'Condiments & Cooking', 'unit' => 'pc', 'price' => 9.00, 'stock_quantity' => 60],

            // Snacks & Biscuits
            ['name' => 'SkyFlakes Crackers Single', 'barcode' => '4800016110016', 'category' => 'Snacks & Biscuits', 'unit' => 'pack', 'price' => 8.00, 'stock_quantity' => 40],
            ['name' => 'Rebisco Chocolate Cream Crackers', 'barcode' => '4800092110018', 'category' => 'Snacks & Biscuits', 'unit' => 'pack', 'price' => 8.00, 'stock_quantity' => 35],
            ['name' => 'Piattos Cheese 40g', 'barcode' => '4800016220012', 'category' => 'Snacks & Biscuits', 'unit' => 'pack', 'price' => 20.00, 'stock_quantity' => 22],

            // Household & Personal Care
            ['name' => 'Surf Powder Cherry Blossom 65g', 'barcode' => '4800888110015', 'category' => 'Household & Personal Care', 'unit' => 'sachet', 'price' => 10.00, 'stock_quantity' => 50],
            ['name' => 'Joy Dishwashing Liquid Lemon Sachet 40ml', 'barcode' => '4902430110013', 'category' => 'Household & Personal Care', 'unit' => 'sachet', 'price' => 12.00, 'stock_quantity' => 45],
            ['name' => 'Safeguard White Bar Soap 60g', 'barcode' => '4902430110020', 'category' => 'Household & Personal Care', 'unit' => 'pc', 'price' => 25.00, 'stock_quantity' => 20],
            ['name' => 'Palmolive Naturals Pink Shampoo 15ml', 'barcode' => '8850006110014', 'category' => 'Household & Personal Care', 'unit' => 'sachet', 'price' => 8.00, 'stock_quantity' => 60],
            ['name' => 'Colgate Great Regular Flavor Sachet 20g', 'barcode' => '8850006110021', 'category' => 'Household & Personal Care', 'unit' => 'sachet', 'price' => 12.00, 'stock_quantity' => 0], // Out of stock demo item
        ];

        $products = [];
        foreach ($productsData as $item) {
            $products[$item['name']] = Product::updateOrCreate(
                ['barcode' => $item['barcode']],
                $item
            );
        }

        // 3. Seed Sample Historical Transactions if none exist yet
        if (Transaction::count() === 0) {
            // Sale 1: Earlier today by Cashier
            $tx1 = Transaction::create([
                'receipt_number' => 'OR-' . now()->format('Ymd') . '-0001',
                'cashier_id' => $cashier->id,
                'subtotal' => 74.00,
                'discount_type' => 'none',
                'discount_value' => 0.00,
                'discount_amount' => 0.00,
                'total' => 74.00,
                'amount_paid' => 100.00,
                'change_amount' => 26.00,
                'payment_method' => 'cash',
                'status' => 'completed',
                'created_at' => now()->subHours(2),
            ]);

            TransactionItem::create([
                'transaction_id' => $tx1->id,
                'product_id' => $products['Lucky Me! Pancit Canton Chilimansi']->id,
                'product_name' => 'Lucky Me! Pancit Canton Chilimansi',
                'unit' => 'pack',
                'quantity' => 2,
                'price_at_sale' => 16.00,
                'line_total' => 32.00,
            ]);

            TransactionItem::create([
                'transaction_id' => $tx1->id,
                'product_id' => $products['Argentina Corned Beef 150g']->id,
                'product_name' => 'Argentina Corned Beef 150g',
                'unit' => 'can',
                'quantity' => 1,
                'price_at_sale' => 42.00,
                'line_total' => 42.00,
            ]);

            // Sale 2: Earlier today by Admin with a ₱5.00 discount
            $tx2 = Transaction::create([
                'receipt_number' => 'OR-' . now()->format('Ymd') . '-0002',
                'cashier_id' => $admin->id,
                'subtotal' => 59.00,
                'discount_type' => 'fixed',
                'discount_value' => 5.00,
                'discount_amount' => 5.00,
                'total' => 54.00,
                'amount_paid' => 60.00,
                'change_amount' => 6.00,
                'payment_method' => 'cash',
                'status' => 'completed',
                'created_at' => now()->subHour(),
            ]);

            TransactionItem::create([
                'transaction_id' => $tx2->id,
                'product_id' => $products['Nescafe Original Twin Pack']->id,
                'product_name' => 'Nescafe Original Twin Pack',
                'unit' => 'sachet',
                'quantity' => 1,
                'price_at_sale' => 15.00,
                'line_total' => 15.00,
            ]);

            TransactionItem::create([
                'transaction_id' => $tx2->id,
                'product_id' => $products['Coca-Cola Mismo 290ml']->id,
                'product_name' => 'Coca-Cola Mismo 290ml',
                'unit' => 'bottle',
                'quantity' => 2,
                'price_at_sale' => 22.00,
                'line_total' => 44.00,
            ]);
        }
    }
}
