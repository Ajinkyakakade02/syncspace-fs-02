import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { EditorToolbar } from './EditorToolbar';
import { Page, User, Role } from '../../types';
import { pageService } from '../../services/page.service';
import { Eye, Lock } from 'lucide-react';

interface CollaborativeEditorProps {
  page: Page;
  ydoc: Y.Doc | null;
  awareness: awarenessProtocol.Awareness | null;
  currentUser: User | null;
  canEdit: boolean;
  userRole: Role;
  onTitleChange: (newTitle: string) => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  page,
  ydoc,
  awareness,
  currentUser,
  canEdit,
  userRole,
  onTitleChange,
}) => {
  const [title, setTitle] = useState(page.title);

  useEffect(() => {
    setTitle(page.title);
  }, [page.title]);

  const handleTitleBlur = async () => {
    if (title.trim() && title !== page.title && canEdit) {
      try {
        await pageService.update(page.id, { title: title.trim() });
        onTitleChange(title.trim());
      } catch (err) {
        console.error('Failed to update page title:', err);
      }
    }
  };

  const editor = useEditor(
    {
      editable: canEdit,
      extensions: [
        // CRDT collaboration replaces standard history
        StarterKit.configure({
          history: false,
        }),
        Highlight,
        Underline,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Link.configure({
          openOnClick: false,
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        ...(ydoc
          ? [
              Collaboration.configure({
                document: ydoc,
              }),
            ]
          : []),
        ...(awareness && currentUser
          ? [
              CollaborationCursor.configure({
                provider: { awareness } as any,
                user: {
                  name: currentUser.name,
                  color: currentUser.cursorColor || '#3b82f6',
                },
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class:
            'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[600px] text-base leading-relaxed',
        },
      },
    },
    [ydoc, awareness, canEdit]
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
      {/* Read-Only Notice for Viewers / Commenters */}
      {!canEdit && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <Eye className="w-4 h-4 text-amber-600" />
          <span>
            You are viewing this document with <strong>{userRole.toLowerCase()}</strong> permissions. Editing is disabled.
          </span>
        </div>
      )}

      {/* Editor Toolbar */}
      <EditorToolbar editor={editor} disabled={!canEdit} />

      {/* Scrollable Document Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Document Title Header */}
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none">{page.icon || '📄'}</span>
            <input
              type="text"
              value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled Document"
              className="w-full text-3xl font-extrabold text-slate-900 dark:text-slate-100 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800" />

          {/* TipTap Collaborative Canvas */}
          <div className="relative">
            {!ydoc ? (
              <div className="py-20 text-center text-slate-400 animate-pulse">
                Initializing Yjs CRDT synchronization...
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
