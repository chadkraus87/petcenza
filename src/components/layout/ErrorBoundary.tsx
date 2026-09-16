import { Component, type ReactNode } from 'react'

/**
 * Contains a crash to the page it happened on. Without this, one component throwing unmounts the
 * whole tree and the user gets a blank white screen with no way back except a hard refresh.
 * AppShell keys it on the route, so navigating away clears the error.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: unknown) { console.error('Page crashed:', error) }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl mb-2">This page hit a problem</h1>
        <p className="text-muted mb-4">
          Your records are safe — nothing was lost. Try again, or head back to Today.
        </p>
        <div className="flex gap-3">
          <button onClick={() => location.reload()} className="btn btn-primary">Try again</button>
          <a href="/" className="btn btn-secondary">Back to Today</a>
        </div>
      </main>
    )
  }
}
