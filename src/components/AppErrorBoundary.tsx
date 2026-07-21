import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
    readonly children: ReactNode;
}

interface AppErrorBoundaryState {
    readonly message?: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    public state: AppErrorBoundaryState = {};

    public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
        return { message: error.message || 'The floor interface could not be initialized.' };
    }

    public componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('Jarvis HQ interface failure', error, info.componentStack);
    }

    public render() {
        if (!this.state.message) return this.props.children;
        return (
            <main id="app-root">
                <div className="error-screen" role="alert">
                    <div className="loading-title">JARVIS HQ INTERFACE ERROR</div>
                    <p>{this.state.message}</p>
                    <button type="button" onClick={() => window.location.reload()}>Retry</button>
                </div>
            </main>
        );
    }
}
