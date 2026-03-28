import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repository } from './data/repository';
import { authRouter } from './routes/auth';
import { apiRouter } from './routes/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  await repository.init();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'school-disciplinary-wall', mode: isProduction ? 'production' : 'development' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(rootDir, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const html = await vite.transformIndexHtml(req.originalUrl, `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>班级违纪登记与德育分管理系统</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (error) {
        next(error);
      }
    });
  } else {
    const clientDist = path.resolve(rootDir, 'dist/client');
    app.use(express.static(clientDist));
    app.use('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('请求处理失败', error);
    res.status(500).json({ message: '服务内部错误。' });
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`服务已启动：http://localhost:${port}`);
  });
}

createServer().catch((error) => {
  console.error('服务启动失败', error);
  process.exit(1);
});

