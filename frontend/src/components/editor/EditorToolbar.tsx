import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  FileCode,
  Link as LinkIcon,
  Minus,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, disabled = false }) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const btnClass = (isActive: boolean) =>
    `p-1.5 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
      isActive ? 'bg-slate-200 dark:bg-slate-700 text-brand-600 dark:text-brand-400 font-bold' : ''
    } disabled:opacity-30 disabled:pointer-events-none`;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 p-1.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 backdrop-blur-md">
      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive('heading', { level: 1 }))}
        disabled={disabled}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive('heading', { level: 2 }))}
        disabled={disabled}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive('heading', { level: 3 }))}
        disabled={disabled}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

      {/* Basic Formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
        disabled={disabled}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
        disabled={disabled}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnClass(editor.isActive('underline'))}
        disabled={disabled}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btnClass(editor.isActive('strike'))}
        disabled={disabled}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={btnClass(editor.isActive('highlight'))}
        disabled={disabled}
        title="Highlight"
      >
        <Highlighter className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
        disabled={disabled}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
        disabled={disabled}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={btnClass(editor.isActive('taskList'))}
        disabled={disabled}
        title="Task Checklist"
      >
        <CheckSquare className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

      {/* Blocks & Links */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
        disabled={disabled}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btnClass(editor.isActive('code'))}
        disabled={disabled}
        title="Inline Code"
      >
        <Code className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive('codeBlock'))}
        disabled={disabled}
        title="Code Block"
      >
        <FileCode className="w-4 h-4" />
      </button>
      <button
        onClick={setLink}
        className={btnClass(editor.isActive('link'))}
        disabled={disabled}
        title="Insert Link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnClass(false)}
        disabled={disabled}
        title="Divider"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={addTable}
        className={btnClass(editor.isActive('table'))}
        disabled={disabled}
        title="Insert 3x3 Table"
      >
        <TableIcon className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

      {/* Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={btnClass(editor.isActive({ textAlign: 'left' }))}
        disabled={disabled}
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={btnClass(editor.isActive({ textAlign: 'center' }))}
        disabled={disabled}
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={btnClass(editor.isActive({ textAlign: 'right' }))}
        disabled={disabled}
        title="Align Right"
      >
        <AlignRight className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

      {/* Undo / Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        className={btnClass(false)}
        disabled={disabled || !editor.can().undo()}
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        className={btnClass(false)}
        disabled={disabled || !editor.can().redo()}
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
};
