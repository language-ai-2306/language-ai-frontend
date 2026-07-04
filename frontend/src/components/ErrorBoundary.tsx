/**
 * ErrorBoundary — app-wide graceful failure surface. Catches render/runtime
 * errors anywhere below it and shows a recoverable fallback.
 *
 * In local dev it prints the full error + component stack to help debugging; the
 * deployed build shows only a friendly message (details are gated behind
 * import.meta.env.DEV so they never ship to users).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

import './errorboundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    // In production this would go to a monitoring service.
    console.error('UI crashed:', error, info);
  }

  private reset = (): void => this.setState({ error: null, info: null });

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="app-error" role="alert">
        <div className="app-error__card">
          <h2 className="app-error__title">Something went wrong</h2>
          <p className="app-error__msg">
            The screen hit an unexpected error. You can try again — if it keeps happening, reload the
            page.
          </p>

          {import.meta.env.DEV && (
            <pre className="app-error__details">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
              {info?.componentStack ? `\n\nComponent stack:${info.componentStack}` : ''}
            </pre>
          )}

          <button type="button" className="app-error__btn" onClick={this.reset}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
