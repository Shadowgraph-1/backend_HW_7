import { validate } from '../plugins/zod-validator.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskParamsSchema,
  taskQuerySchema,
} from '../schemas/task.schema.js';

export function registerTaskRoutes(fastify, controller) {
  fastify.post('/api/tasks', {
    preHandler: [validate({ body: createTaskSchema })],
  }, controller.create.bind(controller));

  fastify.get('/api/tasks', {
    preHandler: [validate({ query: taskQuerySchema })],
  }, controller.getAll.bind(controller));

  fastify.get('/api/tasks/:id', {
    preHandler: [validate({ params: taskParamsSchema })],
  }, controller.getById.bind(controller));

  fastify.patch('/api/tasks/:id', {
    preHandler: [validate({ params: taskParamsSchema, body: updateTaskSchema })],
  }, controller.update.bind(controller));

  fastify.delete('/api/tasks/:id', {
    preHandler: [validate({ params: taskParamsSchema })],
  }, controller.delete.bind(controller));
}
