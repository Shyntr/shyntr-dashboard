import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CopyButton } from './CopyButton';

export function SecretInput({ 
  value, 
  onChange, 
  placeholder = 'Enter secret',
  readOnly = false,
  showCopy = false,
  testId
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className="pr-10 font-mono text-sm"
          data-testid={testId}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setVisible(!visible)}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          data-testid={`${testId}-toggle`}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      {showCopy && value && (
        <CopyButton value={value} testId={`${testId}-copy`} />
      )}
    </div>
  );
}
