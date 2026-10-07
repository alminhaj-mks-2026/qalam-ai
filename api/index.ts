import app from '../server';

export default function handler(req: any, res: any) {
  return new Promise<void>((resolve, reject) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    res.on('error', reject);

    try {
      app(req, res);
    } catch (err: any) {
      console.error('[Vercel Serverless Invocation Uncaught Exception]:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'سرور کی پروسیسنگ کے دوران غیر متوقع خرابی پیش آئی۔',
          details: err?.message || String(err),
        });
      }
      resolve();
    }
  });
}

export { app };

