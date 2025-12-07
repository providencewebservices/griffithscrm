import { hc } from 'hono/client';
import type { AppType } from '@griffiths-crm/api/src/index';

export const api = hc<AppType>('/api', {
  init: {
    credentials: 'include',
  },
});
