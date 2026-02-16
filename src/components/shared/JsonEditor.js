import Editor from '@monaco-editor/react';
import { useTheme } from '../../context/ThemeContext';

export function JsonEditor({ 
  value, 
  onChange, 
  height = '150px',
  placeholder = '{}',
  testId
}) {
  const { theme } = useTheme();

  const handleChange = (newValue) => {
    onChange(newValue || '');
  };

  return (
    <div 
      className="rounded-md border border-input overflow-hidden"
      data-testid={testId}
    >
      <Editor
        height={height}
        defaultLanguage="json"
        value={value || placeholder}
        onChange={handleChange}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 0,
          padding: { top: 8, bottom: 8 },
          automaticLayout: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
