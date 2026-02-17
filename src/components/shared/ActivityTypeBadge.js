import { cn } from '../../lib/utils';

export function ActivityTypeBadge({ type, className }) {
  const isLoginRequest = type?.toLowerCase() === 'login_request';
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
          isLoginRequest
          ? 'bg-teal-500/15 text-teal-400 border-teal-500/30' 
          : 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        className
      )}
    >
      {isLoginRequest ? 'Login' : type}
    </span>
  );
}
