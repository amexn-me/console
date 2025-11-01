<?php

namespace App\Exports;

use App\Models\Campaign;
use App\Models\Lead;
use App\Models\Activity;
use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use Illuminate\Support\Collection;

class StageChangeAnalysisReportExport implements WithMultipleSheets
{
    protected $campaignId;
    protected $startDate;
    protected $endDate;
    protected $campaignName;

    public function __construct($campaignId, $startDate, $endDate, $campaignName)
    {
        $this->campaignId = $campaignId;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->campaignName = $campaignName;
    }

    public function sheets(): array
    {
        return [
            new LeadWiseStageChangeSheet($this->campaignId, $this->startDate, $this->endDate, $this->campaignName),
            new AgentWiseStageChangeSheet($this->campaignId, $this->startDate, $this->endDate, $this->campaignName),
            new StageTransitionMatrixSheet($this->campaignId, $this->startDate, $this->endDate, $this->campaignName),
        ];
    }
}

class LeadWiseStageChangeSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, ShouldAutoSize
{
    protected $campaignId;
    protected $startDate;
    protected $endDate;
    protected $campaignName;

    public function __construct($campaignId, $startDate, $endDate, $campaignName)
    {
        $this->campaignId = $campaignId;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->campaignName = $campaignName;
    }

    public function collection()
    {
        // Get all leads in this campaign
        $leads = Lead::where('campaign_id', $this->campaignId)
            ->with(['company', 'agent'])
            ->get();

        $leadIds = $leads->pluck('id')->toArray();

        // Get all stage change activities in the date range
        $stageChangeActivities = Activity::whereIn('lead_id', $leadIds)
            ->where('activity_type', 'stage_changed')
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->with(['agent', 'lead'])
            ->orderBy('created_at', 'asc')
            ->get();

        $data = collect();

        foreach ($leads as $lead) {
            // Get stage changes for this lead
            $leadStageChanges = $stageChangeActivities->where('lead_id', $lead->id);
            
            // Track milestone stages
            $picIdentified = 'No';
            $demosBooked = 'No';
            $demosDone = 'No';
            $questionnaireSent = 'No';
            $proposalsSent = 'No';
            
            // Parse stage changes
            $stageProgressions = [];
            foreach ($leadStageChanges as $activity) {
                // Parse remarks: "Stage changed from 'Demo Requested' to 'Questionnaire Sent'"
                if (preg_match("/Stage changed from '(.+)' to '(.+)'/", $activity->remarks, $matches)) {
                    $fromStage = $matches[1];
                    $toStage = $matches[2];
                    $agentName = $activity->agent ? $activity->agent->name : 'Unknown';
                    $date = \Carbon\Carbon::parse($activity->created_at)->format('Y-m-d');
                    
                    $stageProgressions[] = "{$date}: {$fromStage} → {$toStage} (by {$agentName})";
                    
                    // Check for milestone stages (TO stage)
                    if ($toStage === 'PIC Identified') {
                        $picIdentified = 'Yes';
                    }
                    if ($toStage === 'Demo Requested') {
                        $demosBooked = 'Yes';
                    }
                    if ($toStage === 'Demo Completed') {
                        $demosDone = 'Yes';
                    }
                    if ($toStage === 'Questionnaire Sent') {
                        $questionnaireSent = 'Yes';
                    }
                    if ($toStage === 'Proposal') {
                        $proposalsSent = 'Yes';
                    }
                }
            }

            $data->push([
                'Lead ID' => $lead->id,
                'Company' => $lead->company ? $lead->company->name : 'Unknown',
                'Lead Agent' => $lead->agent ? $lead->agent->name : 'Unassigned',
                'Current Stage' => $lead->stage,
                'Total Stage Changes' => $leadStageChanges->count(),
                'PIC Identified' => $picIdentified,
                'Demos Booked' => $demosBooked,
                'Demos Done' => $demosDone,
                'Questionnaire Sent' => $questionnaireSent,
                'Proposals Sent' => $proposalsSent,
                'Stage Progression Details' => $leadStageChanges->isEmpty() 
                    ? 'No stage changes in selected period' 
                    : implode(' | ', $stageProgressions),
            ]);
        }

        return $data;
    }

    public function headings(): array
    {
        return [
            'Lead ID',
            'Company',
            'Lead Agent',
            'Current Stage',
            'Total Stage Changes',
            'PIC Identified',
            'Demos Booked',
            'Demos Done',
            'Questionnaire Sent',
            'Proposals Sent',
            'Stage Progression Details',
        ];
    }

    public function title(): string
    {
        return 'Lead-wise Stage Changes';
    }

    public function styles(Worksheet $sheet)
    {
        // Add campaign info at the top
        $sheet->insertNewRowBefore(1, 4);
        
        $sheet->setCellValue('A1', 'Campaign:');
        $sheet->setCellValue('B1', $this->campaignName);
        $sheet->setCellValue('A2', 'Date Range:');
        $sheet->setCellValue('B2', $this->startDate . ' to ' . $this->endDate);
        $sheet->setCellValue('A3', 'Generated:');
        $sheet->setCellValue('B3', now()->format('Y-m-d H:i:s'));
        
        $sheet->getStyle('A1:A3')->applyFromArray([
            'font' => ['bold' => true],
        ]);
        
        // Style header row
        $sheet->getStyle('A5:K5')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2E7D32'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);

        $sheet->getRowDimension(5)->setRowHeight(30);
        $sheet->setAutoFilter('A5:K5');
        $sheet->freezePane('A6');

        // Color code total stage changes and milestone columns
        $highestRow = $sheet->getHighestRow();
        for ($row = 6; $row <= $highestRow; $row++) {
            $totalChanges = $sheet->getCell('E' . $row)->getValue();
            
            // Color code total stage changes (Column E)
            if ($totalChanges == 0) {
                $sheet->getStyle('E' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'FFE6E6'],
                    ],
                ]);
            } elseif ($totalChanges >= 3) {
                $sheet->getStyle('E' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'E6FFE6'],
                    ],
                ]);
            } elseif ($totalChanges >= 1) {
                $sheet->getStyle('E' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'FFF4E6'],
                    ],
                ]);
            }
            
            // Color code milestone columns (F through J)
            // Green for "Yes", light red for "No"
            $milestoneColumns = ['F', 'G', 'H', 'I', 'J'];
            foreach ($milestoneColumns as $col) {
                $value = $sheet->getCell($col . $row)->getValue();
                if ($value === 'Yes') {
                    $sheet->getStyle($col . $row)->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'E6FFE6'], // Light green
                        ],
                        'font' => [
                            'bold' => true,
                            'color' => ['rgb' => '2E7D32'], // Dark green
                        ],
                    ]);
                } elseif ($value === 'No') {
                    $sheet->getStyle($col . $row)->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'FFE6E6'], // Light red
                        ],
                        'font' => [
                            'color' => ['rgb' => '999999'], // Gray text
                        ],
                    ]);
                }
            }
        }

        return [];
    }
}

class AgentWiseStageChangeSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, ShouldAutoSize
{
    protected $campaignId;
    protected $startDate;
    protected $endDate;
    protected $campaignName;

    public function __construct($campaignId, $startDate, $endDate, $campaignName)
    {
        $this->campaignId = $campaignId;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->campaignName = $campaignName;
    }

    public function collection()
    {
        // Get all leads in this campaign
        $leadIds = Lead::where('campaign_id', $this->campaignId)
            ->pluck('id')
            ->toArray();

        // Get all stage change activities in the date range
        $stageChangeActivities = Activity::whereIn('lead_id', $leadIds)
            ->where('activity_type', 'stage_changed')
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->with(['agent', 'lead.company'])
            ->get();

        // Group by agent
        $agentData = [];
        
        foreach ($stageChangeActivities as $activity) {
            $agentId = $activity->agent_id;
            $agentName = $activity->agent ? $activity->agent->name : 'Unknown';
            
            if (!isset($agentData[$agentId])) {
                $agentData[$agentId] = [
                    'agent_name' => $agentName,
                    'total_changes' => 0,
                    'unique_leads' => [],
                    'stage_transitions' => [],
                ];
            }
            
            $agentData[$agentId]['total_changes']++;
            $agentData[$agentId]['unique_leads'][$activity->lead_id] = true;
            
            // Parse stage change
            if (preg_match("/Stage changed from '(.+)' to '(.+)'/", $activity->remarks, $matches)) {
                $fromStage = $matches[1];
                $toStage = $matches[2];
                $transition = "{$fromStage} → {$toStage}";
                
                if (!isset($agentData[$agentId]['stage_transitions'][$transition])) {
                    $agentData[$agentId]['stage_transitions'][$transition] = 0;
                }
                $agentData[$agentId]['stage_transitions'][$transition]++;
            }
        }

        $data = collect();

        foreach ($agentData as $agentId => $agentInfo) {
            // Format stage transitions
            $transitionDetails = [];
            foreach ($agentInfo['stage_transitions'] as $transition => $count) {
                $transitionDetails[] = "{$transition} ({$count}x)";
            }

            $data->push([
                'Agent Name' => $agentInfo['agent_name'],
                'Total Stage Changes Made' => $agentInfo['total_changes'],
                'Unique Leads Progressed' => count($agentInfo['unique_leads']),
                'Avg Changes per Lead' => count($agentInfo['unique_leads']) > 0 
                    ? round($agentInfo['total_changes'] / count($agentInfo['unique_leads']), 2) 
                    : 0,
                'Stage Transition Breakdown' => implode(' | ', $transitionDetails),
            ]);
        }

        // Sort by total changes descending
        return $data->sortByDesc('Total Stage Changes Made')->values();
    }

    public function headings(): array
    {
        return [
            'Agent Name',
            'Total Stage Changes Made',
            'Unique Leads Progressed',
            'Avg Changes per Lead',
            'Stage Transition Breakdown',
        ];
    }

    public function title(): string
    {
        return 'Agent-wise Stage Changes';
    }

    public function styles(Worksheet $sheet)
    {
        // Add campaign info at the top
        $sheet->insertNewRowBefore(1, 4);
        
        $sheet->setCellValue('A1', 'Campaign:');
        $sheet->setCellValue('B1', $this->campaignName);
        $sheet->setCellValue('A2', 'Date Range:');
        $sheet->setCellValue('B2', $this->startDate . ' to ' . $this->endDate);
        $sheet->setCellValue('A3', 'Generated:');
        $sheet->setCellValue('B3', now()->format('Y-m-d H:i:s'));
        
        $sheet->getStyle('A1:A3')->applyFromArray([
            'font' => ['bold' => true],
        ]);
        
        // Style header row
        $sheet->getStyle('A5:E5')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1565C0'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);

        $sheet->getRowDimension(5)->setRowHeight(30);
        $sheet->setAutoFilter('A5:E5');
        $sheet->freezePane('A6');

        // Color code total changes
        $highestRow = $sheet->getHighestRow();
        for ($row = 6; $row <= $highestRow; $row++) {
            $totalChanges = $sheet->getCell('B' . $row)->getValue();
            
            if ($totalChanges >= 20) {
                $sheet->getStyle('B' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'E6FFE6'],
                    ],
                ]);
            } elseif ($totalChanges >= 10) {
                $sheet->getStyle('B' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'FFF4E6'],
                    ],
                ]);
            } elseif ($totalChanges > 0) {
                $sheet->getStyle('B' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'FFE6E6'],
                    ],
                ]);
            }
        }

        return [];
    }
}

class StageTransitionMatrixSheet implements FromCollection, WithHeadings, WithTitle, WithStyles, ShouldAutoSize
{
    protected $campaignId;
    protected $startDate;
    protected $endDate;
    protected $campaignName;

    public function __construct($campaignId, $startDate, $endDate, $campaignName)
    {
        $this->campaignId = $campaignId;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->campaignName = $campaignName;
    }

    public function collection()
    {
        // Get all leads in this campaign
        $leadIds = Lead::where('campaign_id', $this->campaignId)
            ->pluck('id')
            ->toArray();

        // Get all stage change activities in the date range
        $stageChangeActivities = Activity::whereIn('lead_id', $leadIds)
            ->where('activity_type', 'stage_changed')
            ->whereBetween('created_at', [
                $this->startDate . ' 00:00:00',
                $this->endDate . ' 23:59:59'
            ])
            ->get();

        // Count transitions
        $transitions = [];
        
        foreach ($stageChangeActivities as $activity) {
            // Parse stage change
            if (preg_match("/Stage changed from '(.+)' to '(.+)'/", $activity->remarks, $matches)) {
                $fromStage = $matches[1];
                $toStage = $matches[2];
                $transition = "{$fromStage} → {$toStage}";
                
                if (!isset($transitions[$transition])) {
                    $transitions[$transition] = [
                        'from' => $fromStage,
                        'to' => $toStage,
                        'count' => 0,
                    ];
                }
                $transitions[$transition]['count']++;
            }
        }

        $data = collect();

        foreach ($transitions as $transition => $info) {
            $data->push([
                'From Stage' => $info['from'],
                'To Stage' => $info['to'],
                'Transition Count' => $info['count'],
                'Transition' => $transition,
            ]);
        }

        // Sort by count descending
        return $data->sortByDesc('Transition Count')->values();
    }

    public function headings(): array
    {
        return [
            'From Stage',
            'To Stage',
            'Transition Count',
            'Transition',
        ];
    }

    public function title(): string
    {
        return 'Stage Transition Matrix';
    }

    public function styles(Worksheet $sheet)
    {
        // Add campaign info at the top
        $sheet->insertNewRowBefore(1, 4);
        
        $sheet->setCellValue('A1', 'Campaign:');
        $sheet->setCellValue('B1', $this->campaignName);
        $sheet->setCellValue('A2', 'Date Range:');
        $sheet->setCellValue('B2', $this->startDate . ' to ' . $this->endDate);
        $sheet->setCellValue('A3', 'Generated:');
        $sheet->setCellValue('B3', now()->format('Y-m-d H:i:s'));
        
        $sheet->getStyle('A1:A3')->applyFromArray([
            'font' => ['bold' => true],
        ]);
        
        // Style header row
        $sheet->getStyle('A5:D5')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E65100'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);

        $sheet->getRowDimension(5)->setRowHeight(30);
        $sheet->setAutoFilter('A5:D5');
        $sheet->freezePane('A6');

        // Color code transition counts
        $highestRow = $sheet->getHighestRow();
        for ($row = 6; $row <= $highestRow; $row++) {
            $count = $sheet->getCell('C' . $row)->getValue();
            
            if ($count >= 10) {
                $sheet->getStyle('C' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'E6FFE6'],
                    ],
                ]);
            } elseif ($count >= 5) {
                $sheet->getStyle('C' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'FFF4E6'],
                    ],
                ]);
            }
        }

        return [];
    }
}

