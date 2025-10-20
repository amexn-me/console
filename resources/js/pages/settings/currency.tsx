import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Currency settings',
        href: '/settings/currency',
    },
];

interface CurrencySettingsProps {
    rates: {
        sar_to_aed: number;
        myr_to_aed: number;
    };
}

export default function CurrencySettings({ rates }: CurrencySettingsProps) {
    const { data, setData, put, processing, errors } = useForm({
        sar_to_aed: rates.sar_to_aed,
        myr_to_aed: rates.myr_to_aed,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('currency.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Currency settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall 
                        title="Currency conversion rates" 
                        description="Manage currency conversion rates for ARR calculations. All values in the Cockpit are displayed in AED." 
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Conversion Rates</CardTitle>
                            <CardDescription>
                                Set the conversion rates from other currencies to AED. These rates are used to calculate the ARR and Open Interest in the Cockpit.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-6">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="sar_to_aed">SAR to AED Conversion Rate</Label>
                                        <Input
                                            id="sar_to_aed"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.sar_to_aed}
                                            onChange={(e) => setData('sar_to_aed', parseFloat(e.target.value))}
                                            placeholder="1.00"
                                        />
                                        {errors.sar_to_aed && (
                                            <p className="text-sm text-destructive">{errors.sar_to_aed}</p>
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            Example: If 1 SAR = 1.00 AED, enter 1.00
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="myr_to_aed">MYR to AED Conversion Rate</Label>
                                        <Input
                                            id="myr_to_aed"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.myr_to_aed}
                                            onChange={(e) => setData('myr_to_aed', parseFloat(e.target.value))}
                                            placeholder="0.82"
                                        />
                                        {errors.myr_to_aed && (
                                            <p className="text-sm text-destructive">{errors.myr_to_aed}</p>
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            Example: If 1 MYR = 0.82 AED, enter 0.82
                                        </p>
                                    </div>
                                </div>

                                <Button type="submit" disabled={processing}>
                                    Save conversion rates
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

