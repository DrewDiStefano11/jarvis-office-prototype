import { Component, ErrorInfo, ReactNode } from 'react';

type Props = Readonly<{ children: ReactNode; surface: string }>;
type State = Readonly<{ error: Error | null }>;

export class PrototypeErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error(`[${this.props.surface}] render failed`, error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <main className="prototype-error" role="alert">
                <p className="eyebrow">Prototype initialization failed</p>
                <h1>{this.props.surface} could not render</h1>
                <p>{this.state.error.message}</p>
                <div className="floor1-candidate-actions">
                    <button type="button" onClick={() => this.setState({ error: null })}>Retry surface</button>
                    <button type="button" onClick={() => window.location.reload()}>Reload application</button>
                </div>
                {import.meta.env.DEV && <pre>{this.state.error.stack}</pre>}
            </main>
        );
    }
}
