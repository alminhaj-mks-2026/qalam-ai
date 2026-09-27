import React, { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent uncaught errors and rejections from closing the Preview iframe in AI Studio
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Qalam AI] Handled asynchronous error:', event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.warn('[Qalam AI] Handled runtime error:', event.error || event.message);
    event.preventDefault();
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SafeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Qalam AI ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center p-6 font-urdu">
          <div className="max-w-md w-full bg-slate-900 border border-[#D4AF37]/50 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-[#D4AF37] flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white">درخواست میں تعطل پیش آیا</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              ایپلیکیشن کی پیش رفت محفوظ ہے۔ برائے مہربانی نیچے دیے گئے بٹن سے دوبارہ کوشش کریں۔
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold rounded-xl text-sm transition-all"
            >
              صفحہ تازہ کریں (Refresh Application)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SafeErrorBoundary>
      <App />
    </SafeErrorBoundary>
  </StrictMode>,
);
