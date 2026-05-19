import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

await fastify.register(cors, { origin: process.env.CORS_ORIGIN || '*' });

const tasks = new Map();
let idCounter = 1;

function generateId() {
  return String(idCounter++);
}

function findById(id) {
  return tasks.get(id) || null;
}

fastify.post('/api/tasks', async (request, reply) => {
  const { title, description, priority } = request.body || {};

  if (!title || title.length < 1 || title.length > 200) {
    return reply.status(400).send({ error: 'title: 1–200 символов обязательно' });
  }
  if (description && description.length > 1000) {
    return reply.status(400).send({ error: 'description: максимум 1000 символов' });
  }
  const validPriorities = ['low', 'medium', 'high'];
  const taskPriority = validPriorities.includes(priority) ? priority : 'medium';

  const now = new Date().toISOString();
  const task = {
    id: generateId(),
    title,
    description: description || undefined,
    status: 'todo',
    priority: taskPriority,
    createdAt: now,
    updatedAt: now,
  };
  tasks.set(task.id, task);

  return reply.status(201).send(task);
});

fastify.get('/api/tasks', async (request, reply) => {
  const { status, priority, page = '1', limit = '20' } = request.query || {};

  let result = Array.from(tasks.values());

  if (status) {
    result = result.filter((t) => t.status === status);
  }
  if (priority) {
    result = result.filter((t) => t.priority === priority);
  }

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (p - 1) * l;
  const items = result.slice(offset, offset + l);

  return reply.send({ items, total: result.length, page: p, limit: l });
});

fastify.get('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params;
  const task = findById(id);
  if (!task) {
    return reply.status(404).send({ error: 'Task not found' });
  }
  return reply.send(task);
});

fastify.patch('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params;
  const task = findById(id);
  if (!task) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  const { title, description, status, priority } = request.body || {};

  if (title !== undefined) {
    if (title.length < 1 || title.length > 200) {
      return reply.status(400).send({ error: 'title: 1–200 символов' });
    }
    task.title = title;
  }
  if (description !== undefined) {
    if (description.length > 1000) {
      return reply.status(400).send({ error: 'description: максимум 1000 символов' });
    }
    task.description = description;
  }
  const validStatuses = ['todo', 'in_progress', 'done'];
  if (status !== undefined) {
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: 'status: todo | in_progress | done' });
    }
    task.status = status;
  }
  const validPriorities = ['low', 'medium', 'high'];
  if (priority !== undefined) {
    if (!validPriorities.includes(priority)) {
      return reply.status(400).send({ error: 'priority: low | medium | high' });
    }
    task.priority = priority;
  }

  task.updatedAt = new Date().toISOString();

  return reply.send(task);
});

fastify.delete('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params;
  if (!tasks.delete(id)) {
    return reply.status(404).send({ error: 'Task not found' });
  }
  return reply.status(204).send();
});

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
