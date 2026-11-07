<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * List all users with transaction count.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->withCount('transactions')->orderBy('role')->orderBy('full_name');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                    ->orWhere('full_name', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'users' => $query->get(),
        ]);
    }

    /**
     * Register a new user account (Admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:users,username'],
            'full_name' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(['admin', 'cashier'])],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'username.required' => 'Enter a username.',
            'username.unique' => 'Username already exists.',
            'full_name.required' => 'Enter the user\'s full name.',
            'password.required' => 'Enter a password (at least 6 characters).',
            'password.min' => 'Password must be at least 6 characters.',
            'role.required' => 'Select a user role.',
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'full_name' => $validated['full_name'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'User registered successfully.',
            'user' => $user->loadCount('transactions'),
        ], 201);
    }

    /**
     * Update an existing user (Admin only).
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('users', 'username')->ignore($user->id)],
            'full_name' => ['required', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', Rule::in(['admin', 'cashier'])],
            'is_active' => ['required', 'boolean'],
        ], [
            'username.required' => 'Enter a username.',
            'username.unique' => 'Username already exists.',
            'full_name.required' => 'Enter the user\'s full name.',
            'password.min' => 'Password must be at least 6 characters.',
        ]);

        // Prevent active admin from deactivating or demoting their own logged-in account
        if ($request->user()->id === $user->id) {
            if (! $validated['is_active']) {
                return response()->json([
                    'message' => 'You cannot deactivate your own currently logged-in account.',
                ], 422);
            }
            if ($validated['role'] !== 'admin') {
                return response()->json([
                    'message' => 'You cannot change your own Administrator role.',
                ], 422);
            }
        }

        $updateData = [
            'username' => $validated['username'],
            'full_name' => $validated['full_name'],
            'role' => $validated['role'],
            'is_active' => $validated['is_active'],
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        // If deactivated, revoke all active tokens immediately
        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $user->fresh()->loadCount('transactions'),
        ]);
    }

    /**
     * Toggle user active/inactive status.
     */
    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'You cannot deactivate your own currently logged-in account.',
            ], 422);
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => $user->is_active ? 'User account activated.' : 'User account deactivated.',
            'user' => $user->loadCount('transactions'),
        ]);
    }
}
