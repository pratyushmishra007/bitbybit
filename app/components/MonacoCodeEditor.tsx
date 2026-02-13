"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center text-gray-400">
        Loading editor...
      </div>
    )
  }
);

interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  theme?: "vs-dark" | "light";
  placeholder?: string;
}

const languageMap: Record<string, string> = {
  javascript: "javascript",
  js: "javascript",
  python: "python",
  py: "python",
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
  c: "c",
  typescript: "typescript",
  ts: "typescript",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
};

export default function MonacoCodeEditor({
  value,
  onChange,
  language = "javascript",
  height = "300px",
  readOnly = false,
  theme = "vs-dark",
  placeholder = "",
}: MonacoCodeEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const monacoLanguage = languageMap[language.toLowerCase()] || "plaintext";

  if (!mounted) {
    return (
      <div 
        style={{ height: typeof height === "number" ? `${height}px` : height }}
        className="w-full bg-[#1e1e1e] flex items-center justify-center text-gray-400 rounded-md"
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div className="relative rounded-md overflow-hidden border border-gray-700">
      <Editor
        height={height}
        language={monacoLanguage}
        value={value || ""}
        onChange={(val) => onChange(val || "")}
        theme={theme}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 8, bottom: 8 },
          renderWhitespace: "selection",
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          quickSuggestions: true,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
      {!value && placeholder && (
        <div className="absolute top-2 left-14 text-gray-500 pointer-events-none text-sm">
          {placeholder}
        </div>
      )}
    </div>
  );
}
