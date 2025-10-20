<?php

namespace App\Exports;

use App\Models\Activity;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ActivityLogsExport implements FromQuery, WithHeadings, WithMapping
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
            'Date & Time',
            'Company',
            'Agent',
            'Contact',
            'Activity Type',
            'Conversation Method',
            'Connected',
            'Remarks',
            'Notes',
        ];
    }

    public function map($activity): array
    {
        return [
            $activity->created_at ? $activity->created_at->format('Y-m-d H:i:s') : '',
            $activity->company ? $activity->company->name : 'N/A',
            $activity->agent ? $activity->agent->name : 'N/A',
            $activity->contact ? $activity->contact->name : 'N/A',
            $activity->activity_type ?? 'N/A',
            $activity->conversation_method ?? 'N/A',
            $activity->conversation_connected ?? 'N/A',
            $activity->remarks ?? '',
            $activity->notes ?? '',
        ];
    }
}

