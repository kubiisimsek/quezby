import { RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/base/button';
import { Callout } from '@/components/patterns/callout';

/**
 * A page that breaks while drawing says so in its own place and offers a way
 * out, instead of taking the whole panel down with it.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Callout
          tone="bad"
          title="Sayfa açılamadı"
          action={
            <div className="flex gap-2">
              <Button size="sm" tone="ghost" icon={<RotateCcw />} onClick={() => this.setState({ error: null })}>
                Yeniden dene
              </Button>
              <Button size="sm" tone="danger" onClick={() => window.location.reload()}>
                Sayfayı yenile
              </Button>
            </div>
          }
        >
          <p>Bu sayfayı çizerken bir hata oldu. Yeniden dene; olmazsa sayfayı yenile.</p>
        </Callout>
      </div>
    );
  }
}
