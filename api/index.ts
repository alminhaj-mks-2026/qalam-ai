console.log('[DIAGNOSTIC] ENTRY');

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

let appInstance: any = null;
let appInitError: any = null;
let appInitPromise: Promise<any> | null = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (appInitError) throw appInitError;
  if (!appInitPromise) {
    appInitPromise = (async () => {
      try {
        console.log('[DIAGNOSTIC] SERVER_IMPORT_START');
        const serverModule: any = await import('../server');
        const loadedApp = serverModule.default || serverModule.app || serverModule;
        console.log('[DIAGNOSTIC] SERVER_IMPORT_SUCCESS');
        console.log('[DIAGNOSTIC] APP_INITIALIZED');
        console.log('[DIAGNOSTIC] ROUTES_REGISTERED');
        appInstance = loadedApp;
        return appInstance;
      } catch (err: any) {
        appInitError = err;
        console.error('[DIAGNOSTIC] REQUEST_ERROR [MODULE LOAD]:', {
          message: err?.message || String(err),
          stack: err?.stack || 'No stack trace available',
        });
        throw err;
      }
    })();
  }
  return appInitPromise;
}

// Eagerly initiate server loading on container startup
getApp().catch((err: any) => {
  // Error already logged and stored in appInitError
});

export default async function handler(req: any, res: any) {
  const reqStart = Date.now();
  console.log(`[DIAGNOSTIC] REQUEST_RECEIVED: ${req.method} ${req.url} (originalUrl: ${req.originalUrl || 'N/A'})`);

  let app: any;
  try {
    app = await getApp();
  } catch (initErr: any) {
    console.error('[DIAGNOSTIC] REQUEST_ERROR [APP INIT FAILED]:', {
      message: initErr?.message || String(initErr),
      stack: initErr?.stack || 'No stack trace available',
    });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'سرور ماڈیول لوڈ کرنے میں ناکامی۔',
        message: initErr?.message || String(initErr),
        stack: initErr?.stack || 'No stack trace available',
      });
    }
    return;
  }

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
      console.error('[DIAGNOSTIC] REQUEST_ERROR [RESPONSE STREAM]:', {
        message: resErr?.message || String(resErr),
        stack: resErr?.stack || 'No stack trace available',
      });
      safeResolve();
    });

    try {
      app(req, res, (err?: any) => {
        if (err) {
          console.error('[DIAGNOSTIC] REQUEST_ERROR [EXPRESS UNHANDLED ROUTE]:', {
            message: err?.message || String(err),
            stack: err?.stack || 'No stack trace available',
          });
          if (!res.headersSent) {
            res.status(err?.status || 500).json({
              success: false,
              error: err?.message || 'سرور پر غیر متوقع خرابی پیش آئی۔',
              message: err?.message || String(err),
              stack: err?.stack || 'No stack trace available',
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
      console.error('[DIAGNOSTIC] REQUEST_ERROR [SYNCHRONOUS HANDLER]:', {
        message: syncErr?.message || String(syncErr),
        stack: syncErr?.stack || 'No stack trace available',
      });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'سرور کی پروسیسنگ کے دوران غیر متوقع خرابی پیش آئی۔',
          message: syncErr?.message || String(syncErr),
          stack: syncErr?.stack || 'No stack trace available',
        });
      }
      safeResolve();
    }
  });
}
