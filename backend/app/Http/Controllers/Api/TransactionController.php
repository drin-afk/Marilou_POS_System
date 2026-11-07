<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TransactionController extends Controller
{
    /**
     * List and search past transactions.
     * Admin sees all transactions; Cashier sees only their own transactions.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Transaction::query()
            ->with(['cashier:id,username,full_name,role', 'voidedByUser:id,username,full_name', 'items'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if (! $user->isAdmin()) {
            $query->where('cashier_id', $user->id);
        } elseif ($request->filled('cashier_id')) {
            $query->where('cashier_id', (int) $request->query('cashier_id'));
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'like', "%{$search}%")
                    ->orWhereHas('cashier', function ($cq) use ($search) {
                        $cq->where('full_name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%");
                    })
                    ->orWhereHas('items', function ($iq) use ($search) {
                        $iq->where('product_name', 'like', "%{$search}%");
                    });
            });
        }

        if ($status = trim((string) $request->query('status', ''))) {
            if (in_array($status, ['completed', 'voided'], true)) {
                $query->where('status', $status);
            }
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        if ($dateFrom && $dateTo && $dateFrom > $dateTo) {
            return response()->json([
                'message' => 'Invalid date range: Start date cannot be after end date.',
            ], 422);
        }

        $transactions = $query->limit(200)->get();

        return response()->json([
            'transactions' => $transactions,
        ]);
    }

    /**
     * Show a single transaction / receipt.
     */
    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && $transaction->cashier_id !== $user->id) {
            return response()->json([
                'message' => 'You do not have permission to view this receipt.',
            ], 403);
        }

        $transaction->load(['cashier:id,username,full_name,role', 'voidedByUser:id,username,full_name', 'items']);

        return response()->json([
            'transaction' => $transaction,
        ]);
    }

    /**
     * Process a new sale transaction atomically.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'discount_type' => ['nullable', Rule::in(['none', 'fixed', 'percentage'])],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'amount_paid' => ['required', 'numeric', 'min:0'],
        ], [
            'items.required' => 'Cart cannot be empty. Add at least one product.',
            'items.min' => 'Cart cannot be empty. Add at least one product.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
            'amount_paid.required' => 'Enter the payment amount.',
        ]);

        $discountType = $validated['discount_type'] ?? 'none';
        $discountValue = round((float) ($validated['discount_value'] ?? 0), 2);
        $amountPaid = round((float) $validated['amount_paid'], 2);

        if ($discountType === 'percentage' && $discountValue > 100) {
            throw ValidationException::withMessages([
                'discount_value' => ['Percentage discount cannot exceed 100%.'],
            ]);
        }

        $transaction = DB::transaction(function () use ($validated, $discountType, $discountValue, $amountPaid, $request) {
            $productIds = collect($validated['items'])->pluck('product_id')->all();

            // Lock product rows for atomic stock verification and deduction
            $products = Product::whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $subtotal = 0.0;
            $preparedItems = [];

            foreach ($validated['items'] as $itemInput) {
                $product = $products->get($itemInput['product_id']);

                if (! $product) {
                    throw ValidationException::withMessages([
                        'items' => ["One of the selected products is no longer available."],
                    ]);
                }

                $qty = (int) $itemInput['quantity'];

                if ($qty > $product->stock_quantity) {
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for '{$product->name}'. Available stock: {$product->stock_quantity} {$product->unit}."],
                    ]);
                }

                $price = round((float) $product->price, 2);
                $lineTotal = round($price * $qty, 2);
                $subtotal = round($subtotal + $lineTotal, 2);

                $preparedItems[] = [
                    'product' => $product,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit' => $product->unit,
                    'quantity' => $qty,
                    'price_at_sale' => $price,
                    'line_total' => $lineTotal,
                ];
            }

            // Compute discount amount
            $discountAmount = 0.0;
            if ($discountType === 'fixed') {
                if ($discountValue > $subtotal) {
                    throw ValidationException::withMessages([
                        'discount_value' => ['Discount amount cannot be larger than the subtotal (₱' . number_format($subtotal, 2) . ').'],
                    ]);
                }
                $discountAmount = $discountValue;
            } elseif ($discountType === 'percentage') {
                $discountAmount = round($subtotal * ($discountValue / 100), 2);
            } else {
                $discountValue = 0.0;
            }

            // Rule 2: Total = sum of (price x quantity) minus discount; total cannot be below zero
            $total = max(0.0, round($subtotal - $discountAmount, 2));

            // Rule 3: Payment must be at least equal to total before a sale can be saved
            if ($amountPaid < $total) {
                throw ValidationException::withMessages([
                    'amount_paid' => ['Amount paid (₱' . number_format($amountPaid, 2) . ') is less than the total due (₱' . number_format($total, 2) . ').'],
                ]);
            }

            $changeAmount = round($amountPaid - $total, 2);

            // Generate unique receipt number for today: OR-YYYYMMDD-XXXX
            $todayPrefix = 'OR-' . now()->format('Ymd') . '-';
            $lastToday = Transaction::where('receipt_number', 'like', $todayPrefix . '%')
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();

            $nextSeq = 1;
            if ($lastToday && preg_match('/-(\d+)$/', $lastToday->receipt_number, $matches)) {
                $nextSeq = ((int) $matches[1]) + 1;
            }
            $receiptNumber = $todayPrefix . str_pad((string) $nextSeq, 4, '0', STR_PAD_LEFT);

            $sale = Transaction::create([
                'receipt_number' => $receiptNumber,
                'cashier_id' => $request->user()->id,
                'subtotal' => $subtotal,
                'discount_type' => $discountType,
                'discount_value' => $discountValue,
                'discount_amount' => $discountAmount,
                'total' => $total,
                'amount_paid' => $amountPaid,
                'change_amount' => $changeAmount,
                'payment_method' => 'cash',
                'status' => 'completed',
            ]);

            // Save items and deduct stock (Rule 4)
            foreach ($preparedItems as $line) {
                TransactionItem::create([
                    'transaction_id' => $sale->id,
                    'product_id' => $line['product_id'],
                    'product_name' => $line['product_name'],
                    'unit' => $line['unit'],
                    'quantity' => $line['quantity'],
                    'price_at_sale' => $line['price_at_sale'],
                    'line_total' => $line['line_total'],
                ]);

                $line['product']->decrement('stock_quantity', $line['quantity']);
            }

            return $sale->load(['cashier:id,username,full_name,role', 'items']);
        });

        return response()->json([
            'message' => 'Sale completed and saved successfully.',
            'transaction' => $transaction,
        ], 201);
    }

    /**
     * Void / Cancel a mistaken transaction (Admin only).
     * Restores product stock and logs the void reason while preserving immutable line items.
     */
    public function void(Request $request, Transaction $transaction): JsonResponse
    {
        $validated = $request->validate([
            'void_reason' => ['required', 'string', 'max:255'],
        ], [
            'void_reason.required' => 'Enter a reason for voiding this transaction.',
        ]);

        if ($transaction->status === 'voided') {
            return response()->json([
                'message' => 'This transaction has already been voided.',
            ], 422);
        }

        $updated = DB::transaction(function () use ($transaction, $validated, $request) {
            $tx = Transaction::with('items')->lockForUpdate()->findOrFail($transaction->id);

            if ($tx->status === 'voided') {
                abort(422, 'This transaction has already been voided.');
            }

            foreach ($tx->items as $item) {
                $product = Product::withTrashed()->lockForUpdate()->find($item->product_id);
                if ($product) {
                    $product->increment('stock_quantity', $item->quantity);
                }
            }

            $tx->update([
                'status' => 'voided',
                'voided_by' => $request->user()->id,
                'void_reason' => trim($validated['void_reason']),
                'voided_at' => now(),
            ]);

            return $tx->fresh(['cashier:id,username,full_name,role', 'voidedByUser:id,username,full_name', 'items']);
        });

        return response()->json([
            'message' => "Transaction {$updated->receipt_number} voided and product stock restored.",
            'transaction' => $updated,
        ]);
    }
}
