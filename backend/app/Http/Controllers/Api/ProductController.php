<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    /**
     * List all active products (available to both Cashier and Admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->orderBy('category')->orderBy('name');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($category = trim((string) $request->query('category', ''))) {
            if ($category !== 'All') {
                $query->where('category', $category);
            }
        }

        $products = $query->get();
        $categories = Product::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json([
            'products' => $products,
            'categories' => $categories,
        ]);
    }

    /**
     * Create a new product (Admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('products', 'name')->whereNull('deleted_at'),
            ],
            'barcode' => [
                'nullable',
                'string',
                'max:64',
                Rule::unique('products', 'barcode')->whereNull('deleted_at'),
            ],
            'category' => ['required', 'string', 'max:80'],
            'unit' => ['nullable', 'string', 'max:30'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
        ], [
            'name.required' => 'Enter the product name.',
            'name.unique' => 'Product name already exists.',
            'barcode.unique' => 'Barcode already belongs to another product.',
            'category.required' => 'Enter or select a product category.',
            'price.required' => 'Enter the product price.',
            'price.min' => 'Product price cannot be negative.',
            'stock_quantity.required' => 'Enter the stock quantity.',
            'stock_quantity.min' => 'Stock quantity cannot be negative.',
        ]);

        // Clear barcode on soft-deleted record if reused
        if (! empty($validated['barcode'])) {
            Product::onlyTrashed()->where('barcode', $validated['barcode'])->update(['barcode' => null]);
        }

        $product = Product::create([
            'name' => trim($validated['name']),
            'barcode' => ! empty($validated['barcode']) ? trim($validated['barcode']) : null,
            'category' => trim($validated['category']),
            'unit' => ! empty($validated['unit']) ? trim($validated['unit']) : 'pc',
            'price' => round((float) $validated['price'], 2),
            'stock_quantity' => (int) $validated['stock_quantity'],
        ]);

        return response()->json([
            'message' => 'Product added successfully.',
            'product' => $product,
        ], 201);
    }

    /**
     * Update an existing product (Admin only).
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('products', 'name')->ignore($product->id)->whereNull('deleted_at'),
            ],
            'barcode' => [
                'nullable',
                'string',
                'max:64',
                Rule::unique('products', 'barcode')->ignore($product->id)->whereNull('deleted_at'),
            ],
            'category' => ['required', 'string', 'max:80'],
            'unit' => ['nullable', 'string', 'max:30'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
        ], [
            'name.required' => 'Enter the product name.',
            'name.unique' => 'Product name already exists.',
            'barcode.unique' => 'Barcode already belongs to another product.',
            'category.required' => 'Enter or select a product category.',
            'price.required' => 'Enter the product price.',
            'price.min' => 'Product price cannot be negative.',
            'stock_quantity.required' => 'Enter the stock quantity.',
            'stock_quantity.min' => 'Stock quantity cannot be negative.',
        ]);

        if (! empty($validated['barcode'])) {
            Product::onlyTrashed()
                ->where('barcode', $validated['barcode'])
                ->where('id', '!=', $product->id)
                ->update(['barcode' => null]);
        }

        $product->update([
            'name' => trim($validated['name']),
            'barcode' => ! empty($validated['barcode']) ? trim($validated['barcode']) : null,
            'category' => trim($validated['category']),
            'unit' => ! empty($validated['unit']) ? trim($validated['unit']) : 'pc',
            'price' => round((float) $validated['price'], 2),
            'stock_quantity' => (int) $validated['stock_quantity'],
        ]);

        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $product->fresh(),
        ]);
    }

    /**
     * Delete/Archive a product (Admin only).
     * Satisfies Business Rule 5: Past sales stay in history even if a product is deleted.
     */
    public function destroy(Product $product): JsonResponse
    {
        $hasSalesHistory = $product->transactionItems()->exists();

        // Free up barcode so it can be reused if needed
        if ($product->barcode) {
            $product->barcode = null;
            $product->save();
        }

        $product->delete(); // Soft-delete preserves foreign key integrity for transaction_items

        return response()->json([
            'message' => $hasSalesHistory
                ? 'Product removed from active catalog. Past sales records for this item are safely preserved in history.'
                : 'Product deleted successfully.',
            'archived_with_history' => $hasSalesHistory,
        ]);
    }
}
