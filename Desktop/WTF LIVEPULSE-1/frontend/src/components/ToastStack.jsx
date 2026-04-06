import { useEffect } from 'react';
import { useDashboardState } from '../hooks/useDashboard';

function ToastStack() {
  const { state, actions } = useDashboardState();

  useEffect(() => {
    if (!state.toasts.length) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const toast = state.toasts[0];
      if (toast) {
        actions.dismissToast(toast.id);
      }
    }, 4200);

    return () => clearTimeout(timer);
  }, [state.toasts, actions]);

  if (!state.toasts.length) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite">
      {state.toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <div className="toast__title">{toast.title}</div>
          <div className="toast__body">{toast.body}</div>
        </div>
      ))}
    </div>
  );
}

export {
  ToastStack,
};

