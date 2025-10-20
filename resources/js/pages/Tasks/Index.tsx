import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2, Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Tasks',
        href: '/tasks',
    },
];

interface User {
    id: number;
    name: string;
}

interface Company {
    id: number;
    name: string;
}

interface Todo {
    id: number;
    task: string;
    is_completed: boolean;
    created_at: string;
    completed_at: string | null;
    user: User | null;
    company: Company | null;
}

interface PageProps {
    todos: {
        data: Todo[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    users: User[];
    companies: Company[];
    filters: {
        user_id?: number;
        company_id?: number;
        status?: string;
        search?: string;
    };
    [key: string]: any;
}

export default function TasksIndex() {
    const { todos: initialTodos, users, companies, filters } = usePage<PageProps>().props;
    
    const [todos, setTodos] = useState(initialTodos.data);
    const [currentPage, setCurrentPage] = useState(initialTodos.current_page);
    const [hasMorePages, setHasMorePages] = useState(initialTodos.current_page < initialTodos.last_page);
    const [totalCount, setTotalCount] = useState(initialTodos.total);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const isInitialLoad = useRef(true);

    const [localFilters, setLocalFilters] = useState({
        user_id: filters.user_id?.toString() || 'all',
        company_id: filters.company_id?.toString() || 'all',
        status: filters.status || 'all',
        search: filters.search || '',
    });

    const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

    const createForm = useForm({
        task: '',
        user_id: '',
        company_id: '',
    });

    const editForm = useForm({
        task: '',
        user_id: '',
        company_id: '',
    });

    // Reset todos on initial load or when page 1 is loaded
    useEffect(() => {
        if (isInitialLoad.current || initialTodos.current_page === 1) {
            setTodos(initialTodos.data);
            setCurrentPage(initialTodos.current_page);
            setHasMorePages(initialTodos.current_page < initialTodos.last_page);
            setTotalCount(initialTodos.total);
            isInitialLoad.current = false;
        }
    }, [initialTodos.data, initialTodos.current_page]);

    // Search debounce
    useEffect(() => {
        if (searchDebounce) clearTimeout(searchDebounce);

        const timeout = setTimeout(() => {
            applyFilters();
        }, 500);

        setSearchDebounce(timeout);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [localFilters.search]);

    const applyFilters = () => {
        const params: Record<string, string> = {};
        
        if (localFilters.user_id && localFilters.user_id !== 'all') params.user_id = localFilters.user_id;
        if (localFilters.company_id && localFilters.company_id !== 'all') params.company_id = localFilters.company_id;
        if (localFilters.status && localFilters.status !== 'all') params.status = localFilters.status;
        if (localFilters.search) params.search = localFilters.search;

        router.get('/tasks', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        if (key !== 'search') {
            const params: Record<string, string> = {};
            if (newFilters.user_id && newFilters.user_id !== 'all') params.user_id = newFilters.user_id;
            if (newFilters.company_id && newFilters.company_id !== 'all') params.company_id = newFilters.company_id;
            if (newFilters.status && newFilters.status !== 'all') params.status = newFilters.status;
            if (newFilters.search) params.search = newFilters.search;

            router.get('/tasks', params, {
                preserveState: false,
                preserveScroll: false,
            });
        }
    };

    const loadMoreTodos = () => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: Record<string, string> = {
            page: (currentPage + 1).toString(),
        };
        
        if (localFilters.user_id && localFilters.user_id !== 'all') params.user_id = localFilters.user_id;
        if (localFilters.company_id && localFilters.company_id !== 'all') params.company_id = localFilters.company_id;
        if (localFilters.status && localFilters.status !== 'all') params.status = localFilters.status;
        if (localFilters.search) params.search = localFilters.search;

        router.get('/tasks', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['todos'],
            onSuccess: (page: any) => {
                const newTodos = page.props.todos;
                setTodos(prev => [...prev, ...newTodos.data]);
                setCurrentPage(newTodos.current_page);
                setHasMorePages(newTodos.current_page < newTodos.last_page);
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
            onError: () => {
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
        });
    };

    // Infinite scroll handler
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceFromBottom < 200 && hasMorePages && !isLoadingMore && !loadingRef.current) {
                loadMoreTodos();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && hasMorePages && !isLoadingMore) {
                loadMoreTodos();
            }
        };
        
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMorePages, isLoadingMore, currentPage, todos.length]);

    const clearFilters = () => {
        setLocalFilters({
            user_id: 'all',
            company_id: 'all',
            status: 'all',
            search: '',
        });
        router.get('/tasks', {}, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/tasks', {
            onSuccess: () => {
                createForm.reset();
                setIsCreateDialogOpen(false);
            },
        });
    };

    const handleEditTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTodo) return;
        
        editForm.put(`/tasks/${editingTodo.id}`, {
            onSuccess: () => {
                editForm.reset();
                setIsEditDialogOpen(false);
                setEditingTodo(null);
            },
        });
    };

    const handleDeleteTask = (id: number) => {
        if (confirm('Are you sure you want to delete this task?')) {
            router.delete(`/tasks/${id}`);
        }
    };

    const handleToggleComplete = (id: number) => {
        router.post(`/tasks/${id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    const openEditDialog = (todo: Todo) => {
        setEditingTodo(todo);
        editForm.setData({
            task: todo.task,
            user_id: todo.user?.id.toString() || '',
            company_id: todo.company?.id.toString() || '',
        });
        setIsEditDialogOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                <div className="mb-2 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Tasks</h1>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Task</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateTask} className="space-y-4">
                                <div>
                                    <Label htmlFor="task">Task Description</Label>
                                    <Textarea
                                        id="task"
                                        value={createForm.data.task}
                                        onChange={(e) => createForm.setData('task', e.target.value)}
                                        placeholder="Enter task description..."
                                        className="mt-1"
                                        rows={4}
                                    />
                                    {createForm.errors.task && (
                                        <p className="text-sm text-destructive mt-1">{createForm.errors.task}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="user_id">Assign To</Label>
                                    <Select
                                        value={createForm.data.user_id}
                                        onValueChange={(val) => createForm.setData('user_id', val)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {createForm.errors.user_id && (
                                        <p className="text-sm text-destructive mt-1">{createForm.errors.user_id}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="company_id">Company (Optional)</Label>
                                    <Select
                                        value={createForm.data.company_id}
                                        onValueChange={(val) => createForm.setData('company_id', val)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select company (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {companies.map((company) => (
                                                <SelectItem key={company.id} value={company.id.toString()}>
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={createForm.processing}>
                                        {createForm.processing ? 'Creating...' : 'Create Task'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border bg-card p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tasks..."
                            value={localFilters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={localFilters.user_id} onValueChange={(val) => handleFilterChange('user_id', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="User" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {users.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={localFilters.company_id} onValueChange={(val) => handleFilterChange('company_id', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Company" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Companies</SelectItem>
                            {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id.toString()}>
                                    {company.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={localFilters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tasks</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                        Total: {totalCount} (Loaded: {todos.length})
                    </div>
                    {(localFilters.user_id !== 'all' || localFilters.company_id !== 'all' || localFilters.status !== 'all' || localFilters.search) && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-hidden rounded-lg border flex flex-col">
                    <div ref={scrollContainerRef} className="overflow-auto flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">Status</TableHead>
                                    <TableHead className="w-[400px]">Task</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead className="w-24">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {todos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            No tasks found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    todos.map((todo) => (
                                        <TableRow key={todo.id} className={todo.is_completed ? 'opacity-60' : ''}>
                                            <TableCell>
                                                <button
                                                    onClick={() => handleToggleComplete(todo.id)}
                                                    className="hover:text-primary transition-colors"
                                                >
                                                    {todo.is_completed ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    ) : (
                                                        <Circle className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </TableCell>
                                            <TableCell className={`max-w-[400px] truncate ${todo.is_completed ? 'line-through' : ''}`}>
                                                {todo.task}
                                            </TableCell>
                                            <TableCell>{todo.user?.name || '—'}</TableCell>
                                            <TableCell>{todo.company?.name || '—'}</TableCell>
                                            <TableCell>
                                                {todo.created_at ? new Date(todo.created_at).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {todo.completed_at ? new Date(todo.completed_at).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(todo)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteTask(todo.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {isLoadingMore && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                <span className="text-sm text-muted-foreground">Loading more...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditTask} className="space-y-4">
                        <div>
                            <Label htmlFor="edit-task">Task Description</Label>
                            <Textarea
                                id="edit-task"
                                value={editForm.data.task}
                                onChange={(e) => editForm.setData('task', e.target.value)}
                                placeholder="Enter task description..."
                                className="mt-1"
                                rows={4}
                            />
                            {editForm.errors.task && (
                                <p className="text-sm text-destructive mt-1">{editForm.errors.task}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="edit-user_id">Assign To</Label>
                            <Select
                                value={editForm.data.user_id}
                                onValueChange={(val) => editForm.setData('user_id', val)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editForm.errors.user_id && (
                                <p className="text-sm text-destructive mt-1">{editForm.errors.user_id}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="edit-company_id">Company (Optional)</Label>
                            <Select
                                value={editForm.data.company_id}
                                onValueChange={(val) => editForm.setData('company_id', val)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select company (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id.toString()}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={editForm.processing}>
                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
