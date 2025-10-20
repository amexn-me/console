<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $password = Hash::make('password');

        // Create Super Admin
        User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => $password,
                'role' => User::ROLE_SUPER_ADMIN,
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        // Create Sales Admin
        User::firstOrCreate(
            ['email' => 'salesadmin@example.com'],
            [
                'name' => 'Sales Admin',
                'password' => $password,
                'role' => User::ROLE_SALES_ADMIN,
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        // Create Dev Admin
        User::firstOrCreate(
            ['email' => 'devadmin@example.com'],
            [
                'name' => 'Development Admin',
                'password' => $password,
                'role' => User::ROLE_DEV_ADMIN,
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        // Create Project Admin
        User::firstOrCreate(
            ['email' => 'projectadmin@example.com'],
            [
                'name' => 'Project Admin',
                'password' => $password,
                'role' => User::ROLE_PROJECT_ADMIN,
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        // Create Sales User
        User::firstOrCreate(
            ['email' => 'salesuser@example.com'],
            [
                'name' => 'Sales User',
                'password' => $password,
                'role' => User::ROLE_SALES_USER,
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        // Create Dev User
        User::firstOrCreate(
            ['email' => 'devuser@example.com'],
            [
                'name' => 'Development User',
                'password' => $password,
                'role' => User::ROLE_DEV_USER,
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        // Create Project User
        User::firstOrCreate(
            ['email' => 'projectuser@example.com'],
            [
                'name' => 'Project User',
                'password' => $password,
                'role' => User::ROLE_PROJECT_USER,
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        $this->command->info('✓ Created test users with all roles');
        $this->command->info('  Login credentials: email / password: "password"');
        $this->command->table(
            ['Email', 'Role', 'Segment'],
            [
                ['superadmin@example.com', 'super_admin', 'super_admin'],
                ['salesadmin@example.com', 'sales_admin', 'sales'],
                ['devadmin@example.com', 'dev_admin', 'dev'],
                ['projectadmin@example.com', 'project_admin', 'project'],
                ['salesuser@example.com', 'sales_user', 'sales'],
                ['devuser@example.com', 'dev_user', 'dev'],
                ['projectuser@example.com', 'project_user', 'project'],
            ]
        );
    }
}

