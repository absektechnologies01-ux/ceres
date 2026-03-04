import { Link } from 'react-router-dom';

interface TopBarProps {
  title: string;
  backTo?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, backTo, actions }: TopBarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {backTo && (
          <Link
            to={backTo}
            className="flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
