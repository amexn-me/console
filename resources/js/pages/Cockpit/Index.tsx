import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, FolderOpen, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cockpit',
        href: '/cockpit',
    },
];

interface CockpitProps {
    arr: number;
    openInterest: number;
    openProjectsCount: number;
    conversionRates: {
        sar_to_aed: number;
        myr_to_aed: number;
    };
    [key: string]: unknown;
}

export default function Cockpit() {
    const { arr, openInterest, openProjectsCount } = usePage<CockpitProps>().props;
    const [isRefreshing, setIsRefreshing] = useState(false);

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-AE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({ 
            only: ['arr', 'openInterest', 'openProjectsCount', 'conversionRates'],
            onFinish: () => {
                setIsRefreshing(false);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cockpit" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">Cockpit</h1>
                        <p className="text-muted-foreground">
                            Executive overview of key business metrics
                        </p>
                    </div>
                    <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isRefreshing}>
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* ARR Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Annual Recurring Revenue (ARR)
                            </CardTitle>
                            <img src="/images/AED.svg" alt="AED" className="h-3 w-3" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{formatNumber(arr)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                AED (from active contracts)
                            </p>
                        </CardContent>
                    </Card>

                    {/* Open Interest Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Open Interest
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{formatNumber(openInterest)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                AED (total value of open proposals)
                            </p>
                        </CardContent>
                    </Card>

                    {/* Open Projects Count Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Open Projects
                            </CardTitle>
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{openProjectsCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Active projects in progress
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

