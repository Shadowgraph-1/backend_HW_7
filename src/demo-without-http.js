import { createTaskRepository } from './tasks/task.repository.memory.js';
import { createTaskService } from './tasks/task.service.js';

const repo = createTaskRepository();
const service = createTaskService({ taskRepository: repo });

const task = await service.createTask({ title: 'Demo', priority: 'high' });
console.log('Created:', task);

const all = await service.getTasks({});
console.log('All:', all);

try {
  await service.getTask('999');
} catch (err) {
  console.log('Error:', err.message);
}

process.exit(0);
