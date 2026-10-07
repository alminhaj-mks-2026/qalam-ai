import app from '../server';

export default async function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Uncaught Exception]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'سرور کی پروسیسنگ کے دوران غیر متوقع خرابی پیش آئی۔',
        details: err?.message || String(err),
      });
    }
  }
}

export { app };
