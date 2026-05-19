# Домашнее задание #7: Fastify-плагины + Слоённая архитектура

**Зачем?**
Вы научитесь подключать к Fastify реальные плагины, которые используются на каждом проекте (валидация, CORS, env, логирование). А потом возьмёте «толстый контроллер» и разобьёте его на три слоя — так, чтобы бизнес-логику можно было вызвать без HTTP.

---

## Что нужно сдать

Ссылку на публичный репозиторий на GitHub. Преподаватель проверяет: код, историю коммитов, работоспособность сервера (curl-команды или скриншоты Postman/Bruno).

P.S В репозитории есть ветка с подсказками, если вы застряли -> ветка `helper`.

---

## Модель Task (общая для всех частей)

```js
{
  id: string,            // автогенерация
  title: string,         // 1–200 символов, обязательно
  description: string,   // до 1000 символов, опционально
  status: string,        // "todo" | "in_progress" | "done", по умолчанию "todo"
  priority: string,      // "low" | "medium" | "high", по умолчанию "medium"
  createdAt: string,     // ISO дата, автогенерация
  updatedAt: string,     // ISO дата, обновляется при изменении
}
```

---

## Часть 1 — Fastify-плагины и валидация

> **Цель:** научиться подключать плагины к Fastify и валидировать входные данные через Zod.
>
> **Стартовая точка:** в папке `before/server.js` лежит готовый «толстый контроллер» — все 5 эндпоинтов работают, но вся логика (данные + валидация + HTTP) в одном файле. Запустите его через `npm run before` и убедитесь что всё работает.
>
> Ваша задача в части 1 — переписать этот файл: вынести валидацию в Zod-схемы, добавить кастомные ошибки, глобальный error handler, `.env`, CORS и Pino. Роуты и обработчики пока остаются в одном файле (рефакторинг слоёв — в части 2).

### Что нужно сделать (пошагово)

**Шаг 1. Инициализация проекта**

```bash
npm init -y
npm install fastify zod dotenv @fastify/cors
npm install -D pino-pretty
```

Добавьте в `package.json`: `"type": "module"` и скрипты:
```json
"scripts": {
  "before": "node before/server.js",
  "start": "node src/server.js",
  "demo": "node src/demo-without-http.js"
}
```

**Шаг 2. Переменные окружения (.env)**

Создайте `.env`:
```
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=*
```

Создайте `.env.example` — копия `.env` (шаблон для команды).
Создайте `.gitignore` с `.env` и `node_modules`.
В `server.js` — самая первая строка: `import 'dotenv/config'`.

**Шаг 3. Zod-схемы**

Создайте `src/schemas/task.schema.js`. Опишите четыре схемы:

- `createTaskSchema` — для `POST` (title обязательно, priority по умолчанию `"medium"`)
- `updateTaskSchema` — для `PATCH` (все поля опциональны, через `.partial()`)
- `taskParamsSchema` — для `:id` (строка из цифр)
- `taskQuerySchema` — для query-параметров (status, priority, page с default 1, limit с default 20)

**Шаг 4. Плагин валидации**

Создайте `src/plugins/zod-validator.js` — функцию `validate({ body?, params?, query? })`:

- Возвращает Fastify `preHandler`
- Вызывает `schema.parse(request[target])` для каждой переданной схемы
- При ошибке Zod — бросает `ValidationError` с сообщением от Zod
- При успехе — перезаписывает `request[target]` распарсенным значением (чтобы дефолты Zod попали в данные)

**Шаг 5. Кастомные ошибки**

Создайте `src/errors/index.js`:
- `AppError` — базовый класс с `statusCode`
- `ValidationError` → 400
- `NotFoundError` → 404
- `ConflictError` → 409

**Шаг 6. Глобальный error handler**

В `server.js` добавьте `fastify.setErrorHandler(...)`:
- `AppError` → вернуть `err.statusCode` и `{ error: err.message }`
- `ZodError` → вернуть `400` и `{ error: <сообщения> }`
- Всё остальное → `500` + `request.log.error(err)`

**Шаг 7. CORS + логирование**

Зарегистрируйте `@fastify/cors`:
```js
import cors from '@fastify/cors';
fastify.register(cors, { origin: process.env.CORS_ORIGIN || '*' });
```

Настройте логирование в Fastify:
```js
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});
```

**Шаг 8. Роуты с Zod-валидацией**

Перепишите 5 эндпоинтов из `before/server.js` в `src/server.js`, заменив ручную валидацию на Zod:

| Метод    | Путь                | Описание              |
| -------- | ------------------- | --------------------- |
| `POST`   | `/api/tasks`        | Создать задачу        |
| `GET`    | `/api/tasks`        | Список (?status=&priority=&page=&limit=) |
| `GET`    | `/api/tasks/:id`    | Одна задача           |
| `PATCH`  | `/api/tasks/:id`    | Обновить задачу       |
| `DELETE` | `/api/tasks/:id`    | Удалить задачу        |

Данные пока храните в `Map` прямо в server.js (рефакторинг — в части 2).

Подключайте Zod через `preHandler`:
```js
fastify.post('/api/tasks', {
  preHandler: [validate({ body: createTaskSchema })],
}, handler);
```

Сравните: ручная валидация из `before/server.js` (20+ строк `if`) → одна Zod-схема + `preHandler`.

### Что ожидается от студента (контрольные точки)

- [ ] `npm run before` — стартовый сервер работает
- [ ] `npm start` — ваш сервер работает, порт читается из `.env`
- [ ] `POST /api/tasks` с пустым телом → `400` с сообщением от Zod
- [ ] `POST /api/tasks` без `priority` → задача создаётся с `priority: "medium"`
- [ ] `GET /api/tasks/abc` → `400` ("ID должен быть числом")
- [ ] `GET /api/tasks/999` → `404`
- [ ] `GET /api/tasks?status=todo&priority=high` → фильтрация работает
- [ ] `OPTIONS /api/tasks` → есть заголовок `Access-Control-Allow-Origin`
- [ ] В консоли видны логи запросов (pino-pretty)
- [ ] `.gitignore` содержит `.env`

---

## Часть 2 — Трёхслойная архитектура

> **Цель:** взять `src/server.js` из части 1 (где все роуты с обработчиками в одном файле, данные в Map, фильтрация в inline-функциях) и разбить на три слоя: Repository → Service → Controller.
>
> **Что рефакторить:** ваш `src/server.js` после части 1. Там сейчас:
> - `Map` с задачами + `idCounter` (данные)
> - фильтрация по status/priority + пагинация (бизнес-логика)
> - `reply.status(404).send(...)` (HTTP-ответы)
> - генерация id, `createdAt`, `updatedAt` (логика данных)
>
> Всё это нужно разнести по отдельным файлам.

### Что нужно сделать (пошагово)

**Шаг 1. Выделите Repository**

Создайте `src/tasks/task.repository.js`:

- Функция-фабрика `createTaskRepository()` — возвращает объект с методами:
  - `findAll()` — возвращает все задачи как массив
  - `findById(id)` — возвращает задачу или `null`
  - `create(data)` — генерирует `id`, `status: 'todo'`, `createdAt`, `updatedAt`, сохраняет, возвращает
  - `update(id, data)` — обновляет задачу, ставит `updatedAt`, возвращает или `null`
  - `delete(id)` — удаляет, возвращает `true`/`false`
- Данные храните в `Map` (перенесите из роутов)
- **НЕ** импортирует Fastify, не знает про HTTP

**Шаг 2. Выделите Service**

Создайте `src/tasks/task.service.js`:

- Функция-фабрика `createTaskService({ taskRepository })` — принимает Repository через параметр
- Методы:
  - `createTask(data)` — делегирует `taskRepository.create(data)`
  - `getTasks({ status?, priority?, page?, limit? })` — фильтрует и пагинирует
  - `getTask(id)` — возвращает задачу или бросает `new NotFoundError('Task not found')`
  - `updateTask(id, data)` — обновляет или бросает `NotFoundError`
  - `deleteTask(id)` — удаляет или бросает `NotFoundError`
- **НЕ** импортирует `req`, `res`, Fastify, статус-коды
- **НЕ** знает про HTTP

**Шаг 3. Выделите Controller**

Создайте `src/tasks/task.controller.js`:

- Функция-фабрика `createTaskController({ taskService })` — принимает Service
- Каждый метод: `request` → вызвать `taskService` → `reply`
- Пример:
  ```js
  async create(request, reply) {
    const task = await this.taskService.createTask(request.body);
    return reply.status(201).send(task);
  }
  ```
- **НЕ** содержит бизнес-логику, **НЕ** ходит в «базу» напрямую

**Шаг 4. Обновите Router**

Обновите `src/tasks/task.routes.js`:

- Функция `registerTaskRoutes(fastify, controller)` — регистрирует роуты
- Каждый роут ссылается на метод контроллера, а не на inline-функцию
- Zod-валидация остаётся в `preHandler`

**Шаг 5. Склейте всё в server.js**

`server.js` — Composition Root, единственное место где слои соединяются:
```js
const taskRepository = createTaskRepository();
const taskService = createTaskService({ taskRepository });
const taskController = createTaskController({ taskService });
registerTaskRoutes(fastify, taskController);
```

**Шаг 6. Докажите что Service работает без HTTP**

Создайте `src/demo-without-http.js`:
```js
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
```

Добавьте скрипт: `"demo": "node src/demo-without-http.js"`

### Что ожидается от студента (контрольные точки)

- [ ] Все 5 эндпоинтов работают как в части 1
- [ ] `task.repository.js` — только CRUD, без бизнес-логики
- [ ] `task.service.js` — не содержит `request`, `reply`, `status()`, `send()`
- [ ] `task.controller.js` — не содержит фильтрацию, Map, генерацию id
- [ ] `server.js` — склейка в одном месте (Composition Root)
- [ ] `npm run demo` — Service работает без поднятия сервера
- [ ] Структура файлов:
  ```
  before/
  └── server.js                # 💀 Стартовый «толстый контроллер»
  src/
  ├── server.js                # 🏁 Composition Root (после рефакторинга)
  ├── demo-without-http.js     # Демо: Service без HTTP
  ├── errors/index.js
  ├── schemas/task.schema.js
  ├── plugins/zod-validator.js
  └── tasks/
      ├── task.repository.js   # 📦 Repository
      ├── task.service.js      # 🧠 Service
      ├── task.controller.js   # 🌐 Controller
      └── task.routes.js       # 🛣️ Router
  ```

---

## Часть 3 (Доп.) — DI / Фабрики

> **Цель:** понять зачем Dependency Injection нужен на практике.

### Что нужно сделать

**Шаг 1. Два Repository — один для продакшена, один для тестов**

Создайте `src/tasks/task.repository.memory.js` — то что уже есть (Map).

Создайте `src/tasks/task.repository.file.js` — тот же интерфейс, но данные хранятся в JSON-файле `data/tasks.json`:
- При `create` / `update` / `delete` — перезаписывает файл
- При `findAll` / `findById` — читает файл
- Интерфейс **идентичен** memory-версии: `findAll`, `findById`, `create`, `update`, `delete`

**Шаг 2. Выбор реализации через env**

В `server.js` выбирайте Repository по переменной окружения:
```js
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'memory';

const taskRepository = STORAGE_TYPE === 'file'
  ? createTaskFileRepository({ filePath: './data/tasks.json' })
  : createTaskRepository();
```

**Шаг 3. Демонстрация**

- Запустите с `STORAGE_TYPE=memory` — данные в памяти
- Запустите с `STORAGE_TYPE=file` — данные в файле
- Service **не изменился ни одной строкой** — вот зачем DI

### Что ожидается от студента (контрольные точки)

- [ ] Два файла Repository с **одинаковым интерфейсом(одинаковые методы)**
- [ ] Service не меняется при смене Repository
- [ ] `STORAGE_TYPE=memory` → данные теряются при рестарте
- [ ] `STORAGE_TYPE=file` → данные сохраняются в файле
- [ ] В README: объяснение зачем DI нужен (2–3 предложения)

---

## Вопросы для самопроверки

Напишите короткие ответы в `README.md`. Своими словами:

1. Почему Service не должен знать про `req` и `res`?
2. Объясните правило зависимостей: какие слои могут зависеть от каких?
3. Что такое Dependency Injection? Зачем фабрика `createTaskService({ taskRepository })` лучше чем `import { repo } from './repo.js'` внутри Service?
4. Зачем нужен `.env.example`? Почему `.env` не коммитят в Git?

### Ответы

1. Service содержит бизнес-логику, которая не зависит от способа вызова. Если он знает про `req` и `res`, его нельзя переиспользовать без HTTP (CLI, тесты, cron). Разделение упрощает тестирование и поддержку.

2. Controller зависит от Service, Service — от Repository. Обратная связь запрещена: Repository не знает про Service, Service не знает про Controller. Зависимости идут сверху вниз, HTTP-слой — самый внешний.

3. Dependency Injection — передача зависимостей извне, а не создание их внутри модуля. Фабрика `createTaskService({ taskRepository })` позволяет подставить memory- или file-репозиторий без изменения Service, что упрощает тестирование и смену хранилища.

4. `.env.example` — шаблон переменных для команды: видно какие ключи нужны, но без секретов. `.env` не коммитят, потому что там могут быть пароли, токены и локальные настройки, которые нельзя публиковать.

---

## Dependency Injection (Часть 3)

DI позволяет подменять реализацию хранилища (memory или file) через переменную окружения, не меняя бизнес-логику в Service. Service получает Repository через параметр фабрики, а выбор конкретной реализации происходит один раз в `server.js`.

---

## Дедлайн

20.05.2026, 12:00 по МСК

---

## Как сдать

1. Убедитесь, что репозиторий **публичный**.
2. Пришлите ссылку на репозиторий преподавателю.

---

## Полезные ресурсы

- [Zod — документация](https://zod.dev)
- [Fastify — документация](https://fastify.dev/)
- [Fastify CORS plugin](https://github.com/fastify/fastify-cors)
- [Pino — логирование](https://getpino.io/)
- [dotenv](https://github.com/motdotla/dotenv)
