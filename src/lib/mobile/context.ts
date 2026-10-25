import { AsyncLocalStorage } from 'node:async_hooks';
import type { Utilisateur } from '@prisma/client';
// The mobile router authenticates before entering this request-local context.
export const mobileContext = new AsyncLocalStorage<Utilisateur>();
