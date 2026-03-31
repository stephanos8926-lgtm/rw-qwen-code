import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

interface MonacoEditorProps {
  content: string;
  language: string;
  activeLine?: number | null;
  onChange: (value: string | undefined) => void;
}

export function MonacoEditorComponent({ content, language, activeLine, onChange }: MonacoEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (monaco) {
      // Define a custom theme to match our Material/Fluent blend
      monaco.editor.defineTheme('qwen-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0f111500', 
          'editor.lineHighlightBackground': '#ffffff0a',
          'editorLineNumber.foreground': '#4b5563',
          'editorIndentGuide.background': '#ffffff10',
          'editorIndentGuide.activeBackground': '#ffffff30',
        },
      });
      monaco.editor.setTheme('qwen-dark');
    }
  }, [monaco]);

  useEffect(() => {
    if (editorRef.current && activeLine) {
      editorRef.current.revealLineInCenter(activeLine);
      editorRef.current.setPosition({ lineNumber: activeLine, column: 1 });
      editorRef.current.focus();
    }
  }, [activeLine, editorRef.current]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="w-full h-full relative">
      <Editor
        height="100%"
        language={language}
        value={content}
        onChange={onChange}
        onMount={handleEditorDidMount}
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
