import { cn } from '../../lib/utils';

export function ProtocolBadge({ protocol, className }) {
  const isOIDC = protocol?.toLowerCase() === 'oidc';
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        isOIDC 
          ? 'bg-teal-500/15 text-teal-400 border-teal-500/30' 
          : 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        className
      )}
    >
      {isOIDC ? 'OIDC' : 'SAML'}
    </span>
  );
}
