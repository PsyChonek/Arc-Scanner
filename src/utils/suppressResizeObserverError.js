/**
 * Suppress benign ResizeObserver errors that occur when ResizeObserver
 * can't deliver all notifications within a single animation frame.
 * This is a known issue with React Flow and other complex UI libraries.
 */
export function suppressResizeObserverError() {
  // Store the original console.error
  const originalError = console.error;

  // Override console.error to filter out ResizeObserver errors
  console.error = (...args) => {
    // Check if this is a ResizeObserver error
    const errorMessage = args[0]?.toString() || '';
    if (errorMessage.includes('ResizeObserver loop')) {
      // Silently ignore this specific error
      return;
    }
    // Pass all other errors to the original console.error
    originalError.apply(console, args);
  };

  // Catch at window level with higher priority
  const resizeObserverErrHandler = (event) => {
    if (
      event.message === 'ResizeObserver loop completed with undelivered notifications.' ||
      event.message === 'ResizeObserver loop limit exceeded' ||
      (event.message && event.message.includes('ResizeObserver'))
    ) {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }
  };

  // Add listener with capture phase to catch it early
  window.addEventListener('error', resizeObserverErrHandler, true);

  // Also suppress unhandledrejection if it's related
  const unhandledRejectionHandler = (event) => {
    const reason = event.reason?.toString() || '';
    if (reason.includes('ResizeObserver')) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  };

  window.addEventListener('unhandledrejection', unhandledRejectionHandler, true);

  // Return cleanup function
  return () => {
    console.error = originalError;
    window.removeEventListener('error', resizeObserverErrHandler, true);
    window.removeEventListener('unhandledrejection', unhandledRejectionHandler, true);
  };
}
