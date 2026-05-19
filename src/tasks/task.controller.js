export function createTaskController({ taskService }) {
  return {
    async create(request, reply) {
      const task = await taskService.createTask(request.body);
      return reply.status(201).send(task);
    },

    async getAll(request, reply) {
      const result = await taskService.getTasks(request.query);
      return reply.send(result);
    },

    async getById(request, reply) {
      const task = await taskService.getTask(request.params.id);
      return reply.send(task);
    },

    async update(request, reply) {
      const task = await taskService.updateTask(request.params.id, request.body);
      return reply.send(task);
    },

    async delete(request, reply) {
      await taskService.deleteTask(request.params.id);
      return reply.status(204).send();
    },
  };
}
