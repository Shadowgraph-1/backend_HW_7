import { ZodError } from 'zod';
import { ValidationError } from '../errors/index.js';

export function validate(schemas) {
  return async function zodValidator(request, reply) {
    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      try {
        request[target] = schema.parse(request[target]);
      } catch (err) {
        if (err instanceof ZodError) {
          const message = err.issues.map((e) => e.message).join(', ');
          throw new ValidationError(message);
        }
        throw err;
      }
    }
  };
}