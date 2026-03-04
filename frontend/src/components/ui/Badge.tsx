type BadgeVariant = 'pending' | 'in_progress' | 'marked' | 'flagged' | 'active' | 'closed';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  marked: 'bg-green-100 text-green-700',
  flagged: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const defaultLabels: Record<BadgeVariant, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  marked: 'Marked',
  flagged: 'Flagged',
  active: 'Active',
  closed: 'Closed',
};

export default function Badge({ variant, label, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {label ?? defaultLabels[variant]}
    </span>
  );
}
