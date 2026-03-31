import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme

interface LightweightEditorProps {
  content: string;
  onChange: (value: string) => void;
  language?: string;
}

export function LightweightEditorComponent({ content, onChange, language = 'javascript' }: LightweightEditorProps) {
  // Map our language names to Prism language names
  const getPrismLanguage = (lang: string) => {
    switch (lang) {
      case 'ts':
      case 'tsx':
      case 'typescript':
        return Prism.languages.typescript;
      case 'js':
      case 'jsx':
      case 'javascript':
        return Prism.languages.javascript;
      case 'json':
        return Prism.languages.json;
      case 'md':
      case 'markdown':
        return Prism.languages.markdown;
      case 'css':
        return Prism.languages.css;
      case 'html':
        return Prism.languages.html;
      default:
        return Prism.languages.javascript;
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-auto bg-[#1d1f21]">
      <Editor
        value={content}
        onValueChange={onChange}
        highlight={code => Prism.highlight(code, getPrismLanguage(language), language)}
        padding={24}
        style={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 14,
          minHeight: '100%',
        }}
        className="text-gray-300 focus:outline-none leading-relaxed"
        textareaClassName="focus:outline-none"
      />
    </div>
  );
}
