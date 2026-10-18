import { Component, ErrorInfo, ReactNode } from 'react';
import { createSanitizedDiagnostics } from '../../utils/sanitizer';
import { APP_MESSAGES } from '../../messages';
import { AlertOctagon, RotateCcw, Copy, Check, ExternalLink } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopyDiagnostics = () => {
    if (!this.state.error) return;
    const report = createSanitizedDiagnostics(
      this.state.error,
      this.state.errorInfo?.componentStack || undefined
    );
    navigator.clipboard.writeText(report);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const msg = APP_MESSAGES.SYS_CRASH;

      return (
        <div className="min-h-screen w-screen bg-surface-base text-surface-text flex flex-col items-center justify-center p-6 select-text">
          <div className="max-w-xl w-full bg-surface-card border border-red-500/30 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-5">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
              {msg.code}
            </span>

            <h1 className="text-xl font-bold text-surface-text mt-3 mb-2">{msg.title}</h1>
            <p className="text-sm text-surface-muted mb-6">{msg.message}</p>

            <div className="bg-surface-panel border border-surface-border rounded-xl p-4 text-left mb-6 font-mono text-xs overflow-x-auto text-red-600 dark:text-red-400 max-h-36">
              <strong>{this.state.error.name}:</strong> {this.state.error.message}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleCopyDiagnostics}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-panel hover:bg-surface-hover text-surface-text font-medium text-xs border border-surface-border transition cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    Copied Diagnostics
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Sanitized Diagnostics
                  </>
                )}
              </button>

              <a
                href="https://github.com/openpost/openpost/issues/new"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-surface-border hover:bg-surface-panel text-surface-muted hover:text-surface-text text-xs transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Report on GitHub
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
