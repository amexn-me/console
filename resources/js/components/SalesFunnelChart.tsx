import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface SalesFunnelChartProps {
    data: Array<Record<string, any>>;
}

// Define stage order for proper sorting
const STAGE_ORDER = [
    'PIC Not Identified',
    'PIC Identified',
    'Contacted',
    'Demo Requested',
    'Demo Completed',
    'Questionnaire Sent',
    'Questionnaire Replied',
    'Proposal',
    'Closed Won',
    'Closed Lost',
    'Disqualified',
];

// Color palette for different agents
const AGENT_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#a855f7', // violet
];

export function SalesFunnelChart({ data }: SalesFunnelChartProps) {
    // Sort data by stage order
    const sortedData = [...data].sort((a, b) => {
        const aIndex = STAGE_ORDER.indexOf(a.stage);
        const bIndex = STAGE_ORDER.indexOf(b.stage);
        
        // If stage not in order, put at end
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        
        return aIndex - bIndex;
    });

    // Get all unique agent names from the data
    const agentNames = new Set<string>();
    sortedData.forEach(item => {
        Object.keys(item).forEach(key => {
            if (key !== 'stage') {
                agentNames.add(key);
            }
        });
    });
    const agents = Array.from(agentNames);

    // Custom tooltip with sorted agents by count
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
            
            // Sort payload by value in descending order
            const sortedPayload = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
            
            return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-semibold mb-2">{label}</p>
                    <p className="text-sm font-medium mb-1">Total: {total}</p>
                    {sortedPayload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis 
                    type="category" 
                    dataKey="stage" 
                    width={160}
                    tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                />
                {agents.map((agent, index) => (
                    <Bar 
                        key={agent} 
                        dataKey={agent} 
                        stackId="a" 
                        fill={AGENT_COLORS[index % AGENT_COLORS.length]}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}

