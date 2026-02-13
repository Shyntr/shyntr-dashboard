import { Button } from '../ui/button';

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  testId 
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in"
      data-testid={testId}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          data-testid={`${testId}-action-btn`}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
