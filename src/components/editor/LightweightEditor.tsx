interface LightweightEditorProps {
  content: string;
  onChange: (value: string) => void;
}

export function LightweightEditorComponent({ content, onChange }: LightweightEditorProps) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 w-full h-full bg-transparent text-gray-300 font-mono text-sm p-6 resize-none focus:outline-none leading-relaxed"
      spellCheck={false}
      placeholder="Start typing..."
    />
  );
}
