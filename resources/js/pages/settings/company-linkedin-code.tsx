import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import axios from 'axios';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { type BreadcrumbItem } from '@/types';
import { AlertCircle, Download, Upload, CheckCircle2, XCircle, FileText } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Company LinkedIn Code',
        href: '/settings/company-linkedin-code',
    },
];

interface CompanyLinkedInCodeProps {
    stats: {
        total_companies: number;
        with_li_code: number;
    };
}

interface PreviewRow {
    row: number;
    company_id: string;
    company_name: string;
    current_li_code: string | null;
    new_li_code: string | null;
    will_update: boolean;
}

interface PreviewData {
    preview: PreviewRow[];
    errors: string[];
    summary: {
        total_rows: number;
        valid_rows: number;
        error_rows: number;
        will_update: number;
    };
}

export default function CompanyLinkedInCode({ stats }: CompanyLinkedInCodeProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(null);
            setError(null);
        }
    };

    const handlePreview = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!file) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError(null);
        setPreview(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(route('company-linkedin-code.preview'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setPreview(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error processing file');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!file) return;

        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            router.post(route('company-linkedin-code.update'), formData, {
                onFinish: () => {
                    setUploading(false);
                    setFile(null);
                    setPreview(null);
                    // Reset the file input
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                },
            });
        } catch (err) {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const downloadTemplate = () => {
        const csvContent = 'id,li_company_code\n12345,example-company-code\n67890,another-company';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'linkedin_code_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company LinkedIn Code Bulk Update" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall 
                        title="Company LinkedIn Code Bulk Update" 
                        description="Upload a CSV file to bulk update LinkedIn company codes for your companies." 
                    />

                    {/* Stats Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Companies</p>
                                    <p className="text-2xl font-semibold">{stats.total_companies}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">With LinkedIn Code</p>
                                    <p className="text-2xl font-semibold">{stats.with_li_code}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upload Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload CSV File</CardTitle>
                            <CardDescription>
                                Upload a CSV file with company IDs and LinkedIn company codes. The file must have two columns: id and li_company_code.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Alert>
                                    <FileText className="h-4 w-4" />
                                    <AlertTitle>CSV Format</AlertTitle>
                                    <AlertDescription>
                                        Your CSV file must have the following format:
                                        <pre className="mt-2 p-2 bg-muted rounded text-xs">
                                            id,li_company_code{'\n'}
                                            12345,example-company-code{'\n'}
                                            67890,another-company
                                        </pre>
                                        <Button 
                                            variant="link" 
                                            className="mt-2 h-auto p-0"
                                            onClick={downloadTemplate}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Template
                                        </Button>
                                    </AlertDescription>
                                </Alert>

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <form onSubmit={handlePreview} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="file">CSV File</Label>
                                        <Input
                                            id="file"
                                            type="file"
                                            accept=".csv,.txt"
                                            onChange={handleFileChange}
                                            disabled={loading || uploading}
                                        />
                                        {file && (
                                            <p className="text-sm text-muted-foreground">
                                                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button 
                                            type="submit" 
                                            disabled={!file || loading || uploading}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            {loading ? 'Processing...' : 'Preview Changes'}
                                        </Button>
                                        {(file || preview) && (
                                            <Button 
                                                type="button"
                                                variant="outline"
                                                onClick={handleReset}
                                                disabled={loading || uploading}
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview Card */}
                    {preview && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Preview Changes</CardTitle>
                                <CardDescription>
                                    Review the changes before confirming. Only rows marked with "Will Update" will be modified.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Rows</p>
                                            <p className="text-xl font-semibold">{preview.summary.total_rows}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Valid</p>
                                            <p className="text-xl font-semibold text-green-600">{preview.summary.valid_rows}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Will Update</p>
                                            <p className="text-xl font-semibold text-blue-600">{preview.summary.will_update}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Errors</p>
                                            <p className="text-xl font-semibold text-red-600">{preview.summary.error_rows}</p>
                                        </div>
                                    </div>

                                    {/* Errors */}
                                    {preview.errors.length > 0 && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Errors Found ({preview.errors.length})</AlertTitle>
                                            <AlertDescription>
                                                <ul className="mt-2 list-disc list-inside space-y-1">
                                                    {preview.errors.slice(0, 10).map((error, idx) => (
                                                        <li key={idx} className="text-sm">{error}</li>
                                                    ))}
                                                    {preview.errors.length > 10 && (
                                                        <li className="text-sm font-semibold">
                                                            ... and {preview.errors.length - 10} more errors
                                                        </li>
                                                    )}
                                                </ul>
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Preview Table */}
                                    <div className="border rounded-lg">
                                        <div className="max-h-96 overflow-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-16">Row</TableHead>
                                                        <TableHead className="w-24">ID</TableHead>
                                                        <TableHead>Company Name</TableHead>
                                                        <TableHead>Current Code</TableHead>
                                                        <TableHead>New Code</TableHead>
                                                        <TableHead className="w-32">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {preview.preview.map((row) => (
                                                        <TableRow key={row.row}>
                                                            <TableCell className="font-mono text-xs">{row.row}</TableCell>
                                                            <TableCell className="font-mono text-xs">{row.company_id}</TableCell>
                                                            <TableCell className="font-medium">{row.company_name}</TableCell>
                                                            <TableCell>
                                                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                                                    {row.current_li_code || <span className="text-muted-foreground">null</span>}
                                                                </code>
                                                            </TableCell>
                                                            <TableCell>
                                                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                                                    {row.new_li_code || <span className="text-muted-foreground">null</span>}
                                                                </code>
                                                            </TableCell>
                                                            <TableCell>
                                                                {row.will_update ? (
                                                                    <Badge variant="default" className="gap-1">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        Will Update
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="gap-1">
                                                                        <XCircle className="h-3 w-3" />
                                                                        No Change
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Confirm Button */}
                                    {preview.summary.will_update > 0 && (
                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button 
                                                variant="outline"
                                                onClick={handleReset}
                                                disabled={uploading}
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                onClick={handleConfirm}
                                                disabled={uploading}
                                            >
                                                {uploading ? 'Updating...' : `Confirm & Update ${preview.summary.will_update} Companies`}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

