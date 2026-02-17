import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Bold, Italic, Strikethrough, Code, List, ListOrdered, 
  Quote, Heading1, Heading2, Heading3, Undo, Redo, Underline as UnderlineIcon,
  User
} from 'lucide-react';
import { Button } from './ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CollaborativeEditor = ({ document, workspaceId, socket, currentUser, members }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [lastEditBy, setLastEditBy] = useState(null);
  const isRemoteUpdate = useRef(false);
  const typingTimeoutRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start typing your document...',
      }),
    ],
    content: document.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none p-8',
      },
    },
    onUpdate: ({ editor }) => {
      if (!isRemoteUpdate.current) {
        handleContentChange(editor.getHTML());
        broadcastTyping();
      }
    },
  });

  useEffect(() => {
    if (editor && document.content !== editor.getHTML()) {
      isRemoteUpdate.current = true;
      editor.commands.setContent(document.content || '', false);
      isRemoteUpdate.current = false;
    }
  }, [document.document_id]);

  useEffect(() => {
    if (!socket || !editor) return;

    const handleDocumentUpdate = (data) => {
      if (data.document_id === document.document_id) {
        // Don't update if it's from current user
        if (data.user_id === currentUser?.user_id) return;

        const currentContent = editor.getHTML();
        if (currentContent !== data.content) {
          // Save cursor position
          const { from, to } = editor.state.selection;
          
          isRemoteUpdate.current = true;
          editor.commands.setContent(data.content, false);
          isRemoteUpdate.current = false;

          // Try to restore cursor position
          try {
            editor.commands.setTextSelection({ from, to });
          } catch (e) {
            // Cursor position might be invalid after update
          }

          // Show who made the edit
          if (data.user_name) {
            setLastEditBy(data.user_name);
            setTimeout(() => setLastEditBy(null), 3000);
          }
        }
      }
    };

    const handleTypingIndicator = (data) => {
      if (data.document_id === document.document_id && data.user_id !== currentUser?.user_id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.user_name);
          } else {
            newSet.delete(data.user_name);
          }
          return newSet;
        });

        // Auto-remove after 3 seconds
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.user_name);
              return newSet;
            });
          }, 3000);
        }
      }
    };

    socket.on('document_update', handleDocumentUpdate);
    socket.on('typing_indicator', handleTypingIndicator);

    return () => {
      socket.off('document_update', handleDocumentUpdate);
      socket.off('typing_indicator', handleTypingIndicator);
    };
  }, [socket, document.document_id, editor, currentUser]);

  const broadcastTyping = () => {
    if (!socket) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing start
    socket.emit('typing_start', {
      document_id: document.document_id,
      workspace_id: workspaceId,
      user_id: currentUser?.user_id,
      user_name: currentUser?.name,
      isTyping: true
    });

    // Send typing stop after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', {
        document_id: document.document_id,
        workspace_id: workspaceId,
        user_id: currentUser?.user_id,
        user_name: currentUser?.name,
        isTyping: false
      });
    }, 1000);
  };

  const handleContentChange = async (content) => {
    // Emit real-time update
    if (socket?.connected && !isRemoteUpdate.current) {
      socket.emit('document_update', {
        document_id: document.document_id,
        workspace_id: workspaceId,
        content: content,
        user_id: currentUser?.user_id,
        user_name: currentUser?.name
      });
    }

    // Debounced save to backend
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(async () => {
      await saveDocument(content);
    }, 1000);
  };

  const saveDocument = async (content) => {
    setIsSaving(true);
    try {
      await axios.put(
        `${API}/documents/${document.document_id}`,
        { content },
        { withCredentials: true }
      );
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save document:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="glass sticky top-0 z-40 border-b border-[#E2E8F0] p-2 flex items-center gap-1 flex-wrap">
        <Button
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-testid="editor-bold"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-testid="editor-italic"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          data-testid="editor-underline"
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          data-testid="editor-strike"
          variant={editor.isActive('strike') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleCode().run()}
          data-testid="editor-code"
          variant={editor.isActive('code') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Code className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-[#E2E8F0] mx-1" />

        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-testid="editor-h1"
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-testid="editor-h2"
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          data-testid="editor-h3"
          variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Heading3 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-[#E2E8F0] mx-1" />

        <Button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-testid="editor-bullet-list"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-testid="editor-ordered-list"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-testid="editor-blockquote"
          variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Quote className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-[#E2E8F0] mx-1" />

        <Button
          onClick={() => editor.chain().focus().undo().run()}
          data-testid="editor-undo"
          disabled={!editor.can().undo()}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => editor.chain().focus().redo().run()}
          data-testid="editor-redo"
          disabled={!editor.can().redo()}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Redo className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        {/* Collaboration Indicators */}
        <div className="flex items-center gap-2">
          {typingUsers.size > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#6366F1] bg-[#EEF2FF] px-3 py-1 rounded-full">
              <User className="w-3 h-3" />
              <span>{Array.from(typingUsers).join(', ')} typing...</span>
            </div>
          )}
          
          {lastEditBy && (
            <div className="text-xs text-[#64748B] bg-[#F1F5F9] px-3 py-1 rounded-full">
              Last edit by {lastEditBy}
            </div>
          )}

          {/* Save Status */}
          <div className="text-xs text-[#64748B]">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10B981] rounded-full" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="p-8">
            <h1 className="text-4xl font-bold text-[#0F172A] mb-6 border-b-2 border-transparent focus:border-[#6366F1] outline-none pb-2">
              {document.title}
            </h1>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
