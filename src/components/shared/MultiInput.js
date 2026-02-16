import { Plus, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function MultiInput({ 
  values = [], 
  onChange, 
  placeholder = 'Enter value',
  testId
}) {
  const handleAdd = () => {
    onChange([...values, '']);
  };

  const handleRemove = (index) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues.length > 0 ? newValues : ['']);
  };

  const handleChange = (index, value) => {
    const newValues = [...values];
    newValues[index] = value;
    onChange(newValues);
  };

  const displayValues = values.length > 0 ? values : [''];

  return (
    <div className="space-y-2">
      {displayValues.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            data-testid={`${testId}-${index}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(index)}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            data-testid={`${testId}-remove-${index}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full border-dashed"
        data-testid={`${testId}-add`}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another
      </Button>
    </div>
  );
}
