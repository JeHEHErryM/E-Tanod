import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/i18n';
import { AppLogo } from '@/app/components/AppLogo';

const ERROR_KEY = 'e-tanod:last-error';

interface ErrorBoundaryProps {
  children: ReactNode;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[E-Tanod] Uncaught render error:', error, info.componentStack);
    try {
      const prev = JSON.parse(window.sessionStorage.getItem(ERROR_KEY) ?? 'null');
      window.sessionStorage.setItem(
        ERROR_KEY,
        JSON.stringify({ message: error.message, stack: error.stack, at: Date.now(), count: (prev?.count ?? 0) + 1 }),
      );
    } catch {
      // storage unavailable — ignore
    }
  }

  private reload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[40vh] w-full flex-col items-center justify-center px-6 py-16 text-center">
        <AppLogo size={56} />
        <h1 className="mt-5 font-display text-xl font-black tracking-tight text-ink-900">
          {i18n.t('error.title')}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          {i18n.t('error.desc')} {i18n.t('error.info')}
        </p>
        <button
          onClick={this.reload}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand-700 px-6 text-sm font-bold text-sand-50 transition-colors hover:bg-brand-800"
        >
          {i18n.t('error.reload')}
        </button>
      </div>
    );
  }
}