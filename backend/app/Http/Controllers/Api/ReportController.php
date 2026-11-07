<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Generate sales summary report by period: day, week, month, year, or custom date range.
     */
    public function sales(Request $request): JsonResponse
    {
        $period = $request->query('period', 'day');
        $referenceDateInput = $request->query('reference_date');

        try {
            $refDate = $referenceDateInput ? Carbon::parse($referenceDateInput) : now();
        } catch (\Throwable) {
            return response()->json([
                'message' => 'Invalid reference date provided.',
            ], 422);
        }

        switch ($period) {
            case 'day':
                $startDate = $refDate->copy()->startOfDay();
                $endDate = $refDate->copy()->endOfDay();
                $periodLabel = 'Daily Report (' . $startDate->format('F d, Y') . ')';
                break;
            case 'week':
                $startDate = $refDate->copy()->startOfWeek(Carbon::MONDAY);
                $endDate = $refDate->copy()->endOfWeek(Carbon::SUNDAY);
                $periodLabel = 'Weekly Report (' . $startDate->format('M d, Y') . ' – ' . $endDate->format('M d, Y') . ')';
                break;
            case 'month':
                $startDate = $refDate->copy()->startOfMonth();
                $endDate = $refDate->copy()->endOfMonth();
                $periodLabel = 'Monthly Report (' . $startDate->format('F Y') . ')';
                break;
            case 'year':
                $startDate = $refDate->copy()->startOfYear();
                $endDate = $refDate->copy()->endOfYear();
                $periodLabel = 'Annual Report (' . $startDate->format('Y') . ')';
                break;
            default:
                return response()->json([
                    'message' => 'Invalid report period. Choose day, week, month, or year.',
                ], 422);
        }

        $completedQuery = Transaction::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate]);

        $voidedQuery = Transaction::query()
            ->where('status', 'voided')
            ->whereBetween('created_at', [$startDate, $endDate]);

        $totalSales = (float) (clone $completedQuery)->sum('total');
        $totalSubtotal = (float) (clone $completedQuery)->sum('subtotal');
        $totalDiscounts = (float) (clone $completedQuery)->sum('discount_amount');
        $transactionCount = (int) (clone $completedQuery)->count();
        $voidedCount = (int) (clone $voidedQuery)->count();
        $voidedTotal = (float) (clone $voidedQuery)->sum('total');

        $totalItemsSold = (int) TransactionItem::query()
            ->whereHas('transaction', function ($q) use ($startDate, $endDate) {
                $q->where('status', 'completed')
                    ->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->sum('quantity');

        // Top selling products in the period
        $topProducts = TransactionItem::query()
            ->select(
                'product_id',
                'product_name',
                'unit',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(line_total) as total_revenue')
            )
            ->whereHas('transaction', function ($q) use ($startDate, $endDate) {
                $q->where('status', 'completed')
                    ->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->groupBy('product_id', 'product_name', 'unit')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get();

        // Period transactions list
        $transactions = Transaction::query()
            ->with(['cashier:id,username,full_name,role', 'voidedByUser:id,username,full_name', 'items'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderByDesc('created_at')
            ->get();

        // Quick comparison cards for Today, This Week, This Month, This Year
        $now = now();
        $quickTotals = [
            'day' => (float) Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$now->copy()->startOfDay(), $now->copy()->endOfDay()])
                ->sum('total'),
            'week' => (float) Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$now->copy()->startOfWeek(Carbon::MONDAY), $now->copy()->endOfWeek(Carbon::SUNDAY)])
                ->sum('total'),
            'month' => (float) Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()])
                ->sum('total'),
            'year' => (float) Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$now->copy()->startOfYear(), $now->copy()->endOfYear()])
                ->sum('total'),
        ];

        // Low stock alert count
        $lowStockProducts = Product::query()
            ->where('stock_quantity', '<=', 10)
            ->orderBy('stock_quantity')
            ->get(['id', 'name', 'category', 'unit', 'stock_quantity']);

        return response()->json([
            'period' => $period,
            'period_label' => $periodLabel,
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString(),
            'summary' => [
                'total_sales' => round($totalSales, 2),
                'total_subtotal' => round($totalSubtotal, 2),
                'total_discounts' => round($totalDiscounts, 2),
                'transaction_count' => $transactionCount,
                'total_items_sold' => $totalItemsSold,
                'voided_count' => $voidedCount,
                'voided_total' => round($voidedTotal, 2),
            ],
            'quick_totals' => $quickTotals,
            'top_products' => $topProducts,
            'low_stock_products' => $lowStockProducts,
            'transactions' => $transactions,
        ]);
    }

    /**
     * Download a local SQL backup of the POS tables (Admin only, Option A local backup).
     */
    public function exportBackup(): StreamedResponse
    {
        $filename = 'marilou_pos_backup_' . now()->format('Ymd_His') . '.sql';

        return response()->streamDownload(function () {
            $tables = ['users', 'products', 'transactions', 'transaction_items'];
            $pdo = DB::connection()->getPdo();

            echo "-- Marilou Sari-Sari Store POS Database Backup\n";
            echo "-- Generated at: " . now()->toDateTimeString() . " (Asia/Manila)\n\n";
            echo "SET FOREIGN_KEY_CHECKS=0;\n\n";

            foreach ($tables as $table) {
                $createStmt = DB::select("SHOW CREATE TABLE `{$table}`");
                $createSql = $createStmt[0]->{'Create Table'} ?? '';

                echo "-- Table structure for `{$table}`\n";
                echo "DROP TABLE IF EXISTS `{$table}`;\n";
                echo $createSql . ";\n\n";

                $rows = DB::table($table)->get();
                if ($rows->count() > 0) {
                    echo "-- Data for `{$table}`\n";
                    foreach ($rows as $row) {
                        $rowArray = (array) $row;
                        $columns = array_map(fn ($col) => "`{$col}`", array_keys($rowArray));
                        $values = array_map(function ($val) use ($pdo) {
                            if ($val === null) {
                                return 'NULL';
                            }
                            return $pdo->quote((string) $val);
                        }, array_values($rowArray));

                        echo "INSERT INTO `{$table}` (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ");\n";
                    }
                    echo "\n";
                }
            }

            echo "SET FOREIGN_KEY_CHECKS=1;\n";
        }, $filename, [
            'Content-Type' => 'application/sql',
        ]);
    }
}
