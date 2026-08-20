import { useToastStore, type ToastType } from '../../store/toastStore';

const TYPE_STYLES: Record<ToastType, string> = {
  info:    'bg-gray-800 text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-blue-500 text-white',
  error:   'bg-red-600 text-white',
};

const TYPE_ICON: Record<ToastType, string> = {
  info:    'ℹ',
  success: '✓',
  warning: '⚠',
  error:   '✕',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
            min-w-[260px] max-w-[400px] pointer-events-auto
            animate-fade-in
            ${TYPE_STYLES[toast.type]}
          `}
        >
          <span className="text-base font-bold flex-shrink-0">{TYPE_ICON[toast.type]}</span>
          <span className="text-sm flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 opacity-70 hover:opacity-100 text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
