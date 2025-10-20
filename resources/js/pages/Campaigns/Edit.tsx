import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Campaigns',
        href: '/sales/campaigns',
    },
    {
        title: 'Edit Campaign',
        href: '#',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Product {
    id: number;
    name: string;
    country: string;
}

interface Campaign {
    id: number;
    name: string;
    product?: Product;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    users: User[];
}

interface PageProps {
    campaign: Campaign;
    users: User[];
    products: Product[];
}

export default function CampaignsEdit({ campaign, users = [], products = [] }: PageProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: campaign.name,
        product_id: campaign.product?.id.toString() || '',
        description: campaign.description || '',
        status: campaign.status,
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        user_ids: campaign.users.map((u) => u.id),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('campaigns.update', campaign.id));
    };

    const toggleUser = (userId: number) => {
        setData(
            'user_ids',
            data.user_ids.includes(userId)
                ? data.user_ids.filter((id) => id !== userId)
                : [...data.user_ids, userId]
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${campaign.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.visit(route('campaigns.index'))}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Edit Campaign</h1>
                        <p className="text-muted-foreground">Update campaign details</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                    <div className="space-y-2">
                        <Label htmlFor="name">Campaign Name *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Enter campaign name"
                            required
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="product_id">Product</Label>
                        <Select value={data.product_id || 'none'} onValueChange={(value) => setData('product_id', value === 'none' ? '' : value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                        {product.name} - {product.country}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.product_id && <p className="text-sm text-red-500">{errors.product_id}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Enter campaign description"
                            rows={4}
                        />
                        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                            />
                            {errors.start_date && <p className="text-sm text-red-500">{errors.start_date}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date">End Date</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                            />
                            {errors.end_date && <p className="text-sm text-red-500">{errors.end_date}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Assign Users/Agents</Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`user-${user.id}`}
                                        checked={data.user_ids.includes(user.id)}
                                        onCheckedChange={() => toggleUser(user.id)}
                                    />
                                    <label
                                        htmlFor={`user-${user.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {user.name} ({user.email}) - {user.role}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {errors.user_ids && <p className="text-sm text-red-500">{errors.user_ids}</p>}
                    </div>

                    <div className="flex gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Campaign'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(route('campaigns.index'))}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

