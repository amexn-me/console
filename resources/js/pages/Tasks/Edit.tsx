import { usePage } from '@inertiajs/react';
import type { Task, User } from '@/types';
import TaskForm from './TaskForm';

export default function Edit() {
  const { task, users } = usePage<{ task: Task; users: User[] }>().props;

  return (
    <TaskForm
      task={task}
      users={users}
      onSubmit={form =>
        form.put(route('tasks.update', task.id))
      }
    />
  );
}
