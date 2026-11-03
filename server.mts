import { serve } from '@hono/node-server';
import { app } from './server/app.mts';

serve({ fetch: app.fetch, hostname: '0.0.0.0', port: Number(process.env.PORT ?? 8787) });
