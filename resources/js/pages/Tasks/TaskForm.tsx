import { useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // optional helper for styling
import type { Task, User } from '@/types';


interface TaskFormProps {
  task?: Task;
  users: User[];
  onSubmit: (form: ReturnType<typeof useForm>) => void;
}

export default function TaskForm({ task, users, onSubmit }: TaskFormProps) {
  const form = useForm({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id?.toString() || '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-xl mx-auto">
      {/* Title */}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={form.data.title}
          onChange={e => form.setData('title', e.target.value)}
          className={cn(form.errors.title && 'border-red-500')}
        />
        {form.errors.title && <p className="text-sm text-red-500 mt-1">{form.errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.data.description}
          onChange={e => form.setData('description', e.target.value)}
          className={cn(form.errors.description && 'border-red-500')}
        />
        {form.errors.description && <p className="text-sm text-red-500 mt-1">{form.errors.description}</p>}
      </div>

      {/* Priority */}
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={form.data.priority}
          onValueChange={value => form.setData('priority', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        {form.errors.priority && <p className="text-sm text-red-500 mt-1">{form.errors.priority}</p>}
      </div>

      {/* Assignee */}
      <div>
        <Label htmlFor="assignee_id">Assignee</Label>
        <Select
          value={form.data.assignee_id}
          onValueChange={value => form.setData('assignee_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            
            
            {users.map(user => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.errors.assignee_id && <p className="text-sm text-red-500 mt-1">{form.errors.assignee_id}</p>}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={form.processing}>
          {task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
