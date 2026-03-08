import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div
          className="min-h-screen flex items-center justify-center px-5 font-sans"
          style={{ backgroundColor: '#F5F1E9' }}
        >
          <div
            className="max-w-lg w-full rounded-2xl p-8 sm:p-10 text-center shadow-lg"
            style={{
              backgroundColor: '#F5F1E9',
              border: '1px solid rgba(10, 41, 27, 0.12)',
              boxShadow: '0 4px 24px rgba(10, 41, 27, 0.08)',
            }}
          >
            {/* Decorative gold accent */}
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(200, 149, 46, 0.2) 0%, transparent 70%)',
                border: '2px solid rgba(200, 149, 46, 0.4)',
              }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: '#C8952E' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1
              className="text-xl sm:text-2xl font-semibold mb-3"
              style={{ color: '#0A291B' }}
            >
              Something went wrong
            </h1>
            <p
              className="text-base mb-6 opacity-90"
              style={{ color: '#0A291B' }}
            >
              We encountered an unexpected error. Please try again.
            </p>

            {isDev && this.state.error && (
              <pre
                className="text-left text-sm p-4 rounded-xl mb-6 overflow-x-auto max-h-32 overflow-y-auto"
                style={{
                  backgroundColor: 'rgba(10, 41, 27, 0.06)',
                  color: '#0A291B',
                  border: '1px solid rgba(10, 41, 27, 0.1)',
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            <button
              type="button"
              onClick={this.handleTryAgain}
              className="touch-target px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                backgroundColor: '#0A291B',
                color: '#F5F1E9',
                boxShadow: '0 2px 8px rgba(10, 41, 27, 0.2)',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
