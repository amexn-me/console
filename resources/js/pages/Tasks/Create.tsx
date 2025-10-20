import { usePage } from '@inertiajs/react';
import type { User } from '@/types';
import TaskForm from './TaskForm';

export default function Create() {
  const { users } = usePage<{ users: User[] }>().props;

  return (
    <TaskForm
      users={users}
      onSubmit={form =>
        form.post(route('tasks.store'), {
          onSuccess: () => form.reset(),
        })
      }
    />
  );
}
