<?php

namespace App\Exports;

use App\Models\Company;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class CompaniesExport implements FromQuery, WithHeadings, WithMapping
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
            'ID',
            'Company',
            'Stage',
            'Agent',
            'Partner Name',
            'Next Follow-up',
            'Total Contacts',
            'Highest Interest Level',
            'Created At',
        ];
    }

    public function map($company): array
    {
        return [
            $company->id,
            $company->name,
            $company->stage,
            $company->agent ? $company->agent->name : '',
            $company->partner ? $company->partner->name : '',
            $company->next_followup_date ? $company->next_followup_date->format('Y-m-d') : '',
            $company->contacts_count ?? 0,
            $company->highest_interest_level ?? '',
            $company->created_at ? $company->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}

