import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, Connect } from 'vite';
import { loadEnv } from 'vite';

const RICHARD_CHAT_PATH = '/api/chat/richard';

function applyRichardEnv(mode: string): void {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }
  if (env.OPENAI_MODEL) {
    process.env.OPENAI_MODEL = env.OPENAI_MODEL;
  }
  if (env.SUPABASE_URL) {
    process.env.SUPABASE_URL = env.SUPABASE_URL;
  }
  if (env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
    process.env.SUPABASE_URL = env.VITE_SUPABASE_URL;
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (env.SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
  }
  if (env.VITE_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
  }
}

function registerRichardMiddleware(middlewares: Connect.Server, mode: string): void {
  applyRichardEnv(mode);

  middlewares.use((req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = req.url?.split('?')[0];

    if (url !== RICHARD_CHAT_PATH || req.method !== 'POST') {
      next();
      return;
    }

    void (async () => {
      try {
        const { POST } = await import('./api/chat/richard/route.ts');
        await POST(req, res);
      } catch (error) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          const message =
            error instanceof Error ? error.message : 'Erreur interne du middleware Richard.';
          res.end(JSON.stringify({ error: message }));
        } else {
          res.end();
        }
      }
    })();
  });
}

export function richardApiPlugin(): Plugin {
  return {
    name: 'richard-api',
    configureServer(server) {
      registerRichardMiddleware(server.middlewares, 'development');
    },
    configurePreviewServer(server) {
      registerRichardMiddleware(server.middlewares, 'production');
    },
  };
}
