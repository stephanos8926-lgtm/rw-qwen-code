import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';

interface MonacoEditorProps {
  content: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

export function MonacoEditorComponent({ content, language, onChange }: MonacoEditorProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      // Define a custom theme to match our Material/Fluent blend
      monaco.editor.defineTheme('qwen-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0f111500', // Transparent to let the container background show, though Monaco might not fully support transparency, we try.
          'editor.lineHighlightBackground': '#ffffff0a',
          'editorLineNumber.foreground': '#4b5563',
          'editorIndentGuide.background': '#ffffff10',
          'editorIndentGuide.activeBackground': '#ffffff30',
        },
      });
      monaco.editor.setTheme('qwen-dark');
    }
  }, [monaco]);

  return (
    <div className="w-full h-full relative">
      <Editor
        height="100%"
        language={language}
        value={content}
        onChange={onChange}
        theme="qwen-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          lineHeight: 24,
          padding: { top: 24, bottom: 24 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          renderLineHighlight: 'all',
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading Monaco Editor...
          </div>
        }
      />
    </div>
  );
}
