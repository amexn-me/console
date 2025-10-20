<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'FTA eInvoicing',
                'country' => 'UAE',
                'is_active' => true,
            ],
            [
                'name' => 'ZATCA eInvoicing',
                'country' => 'KSA',
                'is_active' => true,
            ],
            [
                'name' => 'LHDNM eInvoicing',
                'country' => 'Malaysia',
                'is_active' => true,
            ],
            [
                'name' => 'FIRS eInvoicing',
                'country' => 'Nigeria',
                'is_active' => true,
            ],
        ];

        foreach ($products as $product) {
            Product::firstOrCreate(
                ['name' => $product['name'], 'country' => $product['country']],
                $product
            );
        }
    }
}

