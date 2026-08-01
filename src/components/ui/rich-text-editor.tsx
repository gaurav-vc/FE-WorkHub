import React, { useRef, useEffect } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    // Return focus to editor
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border rounded-md overflow-hidden bg-white flex flex-col shadow-sm">
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b bg-slate-50/50">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-700" onClick={() => exec('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-700" onClick={() => exec('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-700" onClick={() => exec('justifyLeft')} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-700" onClick={() => exec('justifyCenter')} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-700" onClick={() => exec('justifyRight')} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-700" onClick={() => exec('justifyFull')} title="Justify">
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Select onValueChange={(val) => exec('fontName', val)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Font Family" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="flex items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-xs font-bold text-slate-700" onClick={() => {
              const currentSize = document.queryCommandValue('fontSize') || '3';
              const nextSize = Math.max(1, parseInt(currentSize) - 1).toString();
              exec('fontSize', nextSize);
          }} title="Decrease Font Size">A-</Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-xs font-bold text-slate-700" onClick={() => {
              const currentSize = document.queryCommandValue('fontSize') || '3';
              const nextSize = Math.min(7, parseInt(currentSize) + 1).toString();
              exec('fontSize', nextSize);
          }} title="Increase Font Size">A+</Button>
        </div>
      </div>
      <div 
        ref={editorRef}
        className="p-4 min-h-[300px] max-h-[600px] overflow-y-auto focus:outline-none prose prose-sm max-w-none text-foreground/90"
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
}
