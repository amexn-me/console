<?php

namespace App\Exports;

use App\Models\Company;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class PartnerCompaniesExport implements FromQuery, WithHeadings, WithMapping
{
    protected $query;

    public function __construct($query)
    {
        $this->query = $query;
    }

    public function query()
    {
        return $this->query;
    }

    public function headings(): array
    {
        return [
            'Company Name',
            'Stage',
            'Partner Name',
            'Lock-in Period',
        ];
    }

    public function map($company): array
    {
        return [
            $company->name,
            $company->stage,
            $company->partner ? $company->partner->name : 'N/A',
            $company->lockin_date ? $company->lockin_date->format('Y-m-d') : 'N/A',
        ];
    }
}

