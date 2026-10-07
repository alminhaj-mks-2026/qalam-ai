import app from '../server';

console.log('[DIAGNOSTIC] [STARTUP] ENTRY → SERVER IMPORT SUCCESSFUL');

// Process-level unhandled rejection / uncaught exception traps for Vercel Serverless runtime
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason: any) => {
    console.error('[DIAGNOSTIC] [CRITICAL] Unhandled Rejection in Serverless Container:', {
      message: reason?.message || String(reason),
      stack: reason?.stack || 'No stack trace available',
    });
  });

  process.on('uncaughtException', (err: any) => {
    console.error('[DIAGNOSTIC] [CRITICAL] Uncaught Exception in Serverless Container:', {
      message: err?.message || String(err),
      stack: err?.stack || 'No stack trace available',
    });
  });
}

export default function handler(req: any, res: any) {
  const reqStart = Date.now();
  console.log(`[DIAGNOSTIC] [REQUEST RECEIVED] ${req.method} ${req.url} (originalUrl: ${req.originalUrl || 'N/A'})`);

  return new Promise<void>((resolve) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        const duration = Date.now() - reqStart;
        console.log(`[DIAGNOSTIC] [REQUEST FINISHED] ${req.method} ${req.url} (Status: ${res.statusCode}, ${duration}ms)`);
        resolve();
      }
    };

    res.on('finish', safeResolve);
    res.on('close', safeResolve);
    res.on('error', (resErr: any) => {
      console.error('[DIAGNOSTIC] [RESPONSE STREAM ERROR]:', {
        message: resErr?.message || String(resErr),
        stack: resErr?.stack || 'No stack',
      });
      safeResolve();
    });

    try {
      app(req, res, (err?: any) => {
        if (err) {
          console.error('[DIAGNOSTIC] [EXPRESS UNHANDLED ROUTE ERROR]:', {
            message: err?.message || String(err),
            stack: err?.stack || 'No stack',
          });
          if (!res.headersSent) {
            res.status(err?.status || 500).json({
              success: false,
              error: err?.message || 'سرور پر غیر متوقع خرابی پیش آئی۔',
              details: err?.stack || String(err),
            });
          }
        } else if (!res.headersSent) {
          console.warn(`[DIAGNOSTIC] [UNMATCHED ROUTE 404]: ${req.method} ${req.url}`);
          res.status(404).json({
            success: false,
            error: `مطلوبہ اینڈ پوائنٹ (${req.url}) سرور پر دستیاب نہیں ہے۔`,
          });
        }
        safeResolve();
      });
    } catch (syncErr: any) {
      console.error('[DIAGNOSTIC] [SYNCHRONOUS HANDLER EXCEPTION]:', {
        message: syncErr?.message || String(syncErr),
        stack: syncErr?.stack || 'No stack',
      });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'سرور کی پروسیسنگ کے دوران غیر متوقع خرابی پیش آئی۔',
          details: syncErr?.message || String(syncErr),
          stack: syncErr?.stack,
        });
      }
      safeResolve();
    }
  });
}

export { app };


