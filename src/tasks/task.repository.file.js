import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export function createTaskFileRepository({ filePath }) {
  async function load() {
    try {
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { tasks: {}, idCounter: 1 };
      }
      throw err;
    }
  }

  async function save(store) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(store, null, 2));
  }

  return {
    async findAll() {
      const store = await load();
      return Object.values(store.tasks);
    },

    async findById(id) {
      const store = await load();
      return store.tasks[id] || null;
    },

    async create(data) {
      const store = await load();
      const now = new Date().toISOString();
      const task = {
        id: String(store.idCounter++),
        title: data.title,
        description: data.description,
        status: 'todo',
        priority: data.priority ?? 'medium',
        createdAt: now,
        updatedAt: now,
      };
      store.tasks[task.id] = task;
      await save(store);
      return task;
    },

    async update(id, data) {
      const store = await load();
      const task = store.tasks[id];
      if (!task) {
        return null;
      }
      Object.assign(task, data);
      task.updatedAt = new Date().toISOString();
      await save(store);
      return task;
    },

    async delete(id) {
      const store = await load();
      if (!store.tasks[id]) {
        return false;
      }
      delete store.tasks[id];
      await save(store);
      return true;
    },
  };
}
