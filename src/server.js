import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { AppError } from './errors/index.js';
import { createTaskRepository } from './tasks/task.repository.memory.js';
import { createTaskFileRepository } from './tasks/task.repository.file.js';
import { createTaskService } from './tasks/task.service.js';
import { createTaskController } from './tasks/task.controller.js';
import { registerTaskRoutes } from './tasks/task.routes.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

await fastify.register(cors, { origin: process.env.CORS_ORIGIN || '*' });

fastify.setErrorHandler((err, request, reply) => {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({ error: err.message });
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((e) => e.message).join(', ');
    return reply.status(400).send({ error: message });
  }
  request.log.error(err);
  return reply.status(500).send({ error: 'Internal Server Error' });
});

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'memory';

const taskRepository = STORAGE_TYPE === 'file'
  ? createTaskFileRepository({ filePath: './data/tasks.json' })
  : createTaskRepository();

const taskService = createTaskService({ taskRepository });
const taskController = createTaskController({ taskService });

registerTaskRoutes(fastify, taskController);

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
