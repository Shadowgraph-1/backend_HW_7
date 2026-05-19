export function createTaskRepository() {
  const tasks = new Map();
  let idCounter = 1;

  return {
    findAll() {
      return Array.from(tasks.values());
    },

    findById(id) {
      return tasks.get(id) || null;
    },

    create(data) {
      const now = new Date().toISOString();
      const task = {
        id: String(idCounter++),
        title: data.title,
        description: data.description,
        status: 'todo',
        priority: data.priority ?? 'medium',
        createdAt: now,
        updatedAt: now,
      };
      tasks.set(task.id, task);
      return task;
    },

    update(id, data) {
      const task = tasks.get(id);
      if (!task) {
        return null;
      }
      Object.assign(task, data);
      task.updatedAt = new Date().toISOString();
      return task;
    },

    delete(id) {
      return tasks.delete(id);
    },
  };
}
