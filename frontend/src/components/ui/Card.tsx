import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}
