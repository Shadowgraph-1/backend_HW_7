import { NotFoundError } from '../errors/index.js';

export function createTaskService({ taskRepository }) {
  return {
    async createTask(data) {
      return taskRepository.create(data);
    },

    async getTasks({ status, priority, page = 1, limit = 20 } = {}) {
      let result = await taskRepository.findAll();

      if (status) {
        result = result.filter((t) => t.status === status);
      }
      if (priority) {
        result = result.filter((t) => t.priority === priority);
      }

      const offset = (page - 1) * limit;
      const items = result.slice(offset, offset + limit);

      return { items, total: result.length, page, limit };
    },

    async getTask(id) {
      const task = await taskRepository.findById(id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }
      return task;
    },

    async updateTask(id, data) {
      const task = await taskRepository.update(id, data);
      if (!task) {
        throw new NotFoundError('Task not found');
      }
      return task;
    },

    async deleteTask(id) {
      const deleted = await taskRepository.delete(id);
      if (!deleted) {
        throw new NotFoundError('Task not found');
      }
    },
  };
}
