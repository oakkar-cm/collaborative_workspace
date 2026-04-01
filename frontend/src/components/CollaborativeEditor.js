import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { toast } from 'sonner';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Heading1, Heading2, Heading3, Undo, Redo, Underline as UnderlineIcon,
  User, Download, Trash2, MessageSquarePlus
} from 'lucide-react';
import { Button } from './ui/button';
import client from '../api/client';
import UserAvatar from './UserAvatar';
import { createComment, deleteComment, getComments } from '../api/endpoints/comments';
import { exportDocumentDocx, exportDocumentPdf } from '../api/endpoints/documents';

const CollaborativeEditor = ({ document, workspaceId, socket, currentUser, members }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [lastEditBy, setLastEditBy] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentPopup, setCommentPopup] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [isCommenting, setIsCommenting] = useState(false);
  const [exportingType, setExportingType] = useState('');
  const isRemoteUpdate = useRef(false);
  const typingTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const broadcastTimeoutRef = useRef(null);
  const pendingBroadcastContentRef = useRef(null);
  const lastSentContentRef = useRef(document?.content || '');
  const isTypingRef = useRef(false);
  const lastEditTimeoutRef = useRef(null);

  const socketRef = useRef(socket);
  const documentRef = useRef(document);
  const currentUserRef = useRef(currentUser);
  const workspaceIdRef = useRef(workspaceId);

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { documentRef.current = document; }, [document]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { workspaceIdRef.current = workspaceId; }, [workspaceId]);
  useEffect(() => {
    lastSentContentRef.current = document?.content || '';
  }, [document?.document_id, document?.content]);

  const saveDocument = useCallback(async (content) => {
    setIsSaving(true);
    try {
      await client.put(`/documents/${documentRef.current.document_id}`, { content });
      setLastSaved(new Date());
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const data = await getComments(document.document_id);
      setComments(data);
    } catch (error) {
      toast.error('Failed to load comments');
    }
  }, [document.document_id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const broadcastTyping = useCallback(() => {
    const s = socketRef.current;
    if (!s?.connected) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      s.emit('typing_start', {
        document_id: documentRef.current.document_id,
        workspace_id: workspaceIdRef.current,
        user_id: currentUserRef.current?.user_id,
        user_name: currentUserRef.current?.name,
        isTyping: true
      });
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      s.emit('typing_stop', {
        document_id: documentRef.current.document_id,
        workspace_id: workspaceIdRef.current,
        user_id: currentUserRef.current?.user_id,
        user_name: currentUserRef.current?.name,
        isTyping: false
      });
    }, 1000);
  }, []);

  const scheduleDocumentBroadcast = useCallback((content) => {
    pendingBroadcastContentRef.current = content;
    if (broadcastTimeoutRef.current) return;

    broadcastTimeoutRef.current = setTimeout(() => {
      broadcastTimeoutRef.current = null;
      const latestContent = pendingBroadcastContentRef.current;
      const s = socketRef.current;
      if (!s?.connected || isRemoteUpdate.current) return;
      if (latestContent === lastSentContentRef.current) return;

      s.emit('document_update', {
        document_id: documentRef.current.document_id,
        workspace_id: workspaceIdRef.current,
        content: latestContent,
        user_id: currentUserRef.current?.user_id,
        user_name: currentUserRef.current?.name
      });
      lastSentContentRef.current = latestContent;
    }, 150);
  }, []);

  const handleContentChange = useCallback((content) => {
    scheduleDocumentBroadcast(content);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDocument(content), 1200);
  }, [saveDocument, scheduleDocumentBroadcast]);

  const extensions = useMemo(() => [
    StarterKit,
    Underline,
    Placeholder.configure({ placeholder: 'Start typing your document...' }),
  ], []);

  const editorProps = useMemo(() => ({
    attributes: { class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none p-8' },
  }), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: document.content || '',
    editorProps,
    onUpdate: ({ editor: tiptapEditor }) => {
      if (!isRemoteUpdate.current) {
        handleContentChange(tiptapEditor.getHTML());
        broadcastTyping();
      }
    },
  });

  useEffect(() => {
    if (!socket || !editor) return;
    const handleDocumentUpdate = (data) => {
      if (data.document_id !== documentRef.current.document_id) return;
      if (data.user_id === currentUserRef.current?.user_id) return;
      if (editor.getHTML() === data.content) return;
      const { from, to } = editor.state.selection;
      isRemoteUpdate.current = true;
      editor.commands.setContent(data.content, false);
      isRemoteUpdate.current = false;
      try { editor.commands.setTextSelection({ from, to }); } catch {}
      if (data.user_name) {
        setLastEditBy(data.user_name);
        if (lastEditTimeoutRef.current) clearTimeout(lastEditTimeoutRef.current);
        lastEditTimeoutRef.current = setTimeout(() => setLastEditBy(null), 3000);
      }
    };
    const handleTypingIndicator = (data) => {
      if (data.document_id !== documentRef.current.document_id) return;
      if (data.user_id === currentUserRef.current?.user_id) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) next.add(data.user_name); else next.delete(data.user_name);
        return next;
      });
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.user_name);
            return next;
          });
        }, 3000);
      }
    };
    socket.on('document_update', handleDocumentUpdate);
    socket.on('typing_indicator', handleTypingIndicator);
    return () => {
      socket.off('document_update', handleDocumentUpdate);
      socket.off('typing_indicator', handleTypingIndicator);
    };
  }, [socket, editor]);

  useEffect(() => {
    if (!editor) return;
    const handleSelectionChange = () => {
      const { from, to } = editor.state.selection;
      if (!from || !to || from === to) {
        setCommentPopup(null);
        return;
      }
      const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
      if (!selectedText) {
        setCommentPopup(null);
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setCommentPopup({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
        from,
        to,
        selected_text: selectedText
      });
    };
    const dom = editor.view.dom;
    dom.addEventListener('mouseup', handleSelectionChange);
    dom.addEventListener('keyup', handleSelectionChange);
    return () => {
      dom.removeEventListener('mouseup', handleSelectionChange);
      dom.removeEventListener('keyup', handleSelectionChange);
    };
  }, [editor]);

  useEffect(() => () => {
    clearTimeout(saveTimeoutRef.current);
    clearTimeout(typingTimeoutRef.current);
    clearTimeout(broadcastTimeoutRef.current);
    clearTimeout(lastEditTimeoutRef.current);
  }, []);

  const handleCreateComment = async () => {
    const activeSelection = pendingSelection || commentPopup;
    if (!activeSelection || !commentDraft.trim()) return;
    setIsCommenting(true);
    try {
      await createComment({
        documentId: document.document_id,
        text: commentDraft.trim(),
        selectionRange: {
          from: activeSelection.from,
          to: activeSelection.to,
          selected_text: activeSelection.selected_text
        }
      });
      setCommentDraft('');
      setCommentPopup(null);
      setPendingSelection(null);
      fetchComments();
      toast.success('Comment added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.comment_id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    }
  };

  const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    setExportingType(type);
    try {
      if (type === 'docx') {
        const blob = await exportDocumentDocx(document.document_id);
        downloadBlob(blob, `${document.title || 'document'}.docx`);
      } else {
        const blob = await exportDocumentPdf(document.document_id);
        downloadBlob(blob, `${document.title || 'document'}.pdf`);
      }
    } catch (error) {
      toast.error(`Failed to export ${type.toUpperCase()}`);
    } finally {
      setExportingType('');
    }
  };

  const prepareSelectionComment = () => {
    const { from, to } = editor.state.selection;
    if (!from || !to || from === to) {
      toast.error('Select text first to add an inline comment');
      return;
    }
    const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
    if (!selectedText) {
      toast.error('Select text first to add an inline comment');
      return;
    }
    setPendingSelection({
      from,
      to,
      selected_text: selectedText
    });
    setCommentPopup(null);
  };

  if (!editor) return null;
  const visibleMembers = (members || []).slice(0, 4);

  return (
    <div className="flex h-full flex-col">
      <div className="glass-panel sticky top-0 z-40 mx-3 mt-3 rounded-2xl border border-blue-100 bg-white/80 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Collaborative Editor</p>
            <p className="text-xs text-[#64748B]">Realtime sync with shared presence</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {visibleMembers.map((member) => (
                <UserAvatar key={member.user_id} name={member.name} imageUrl={member.picture} className="h-8 w-8 ring-2 ring-white" />
              ))}
            </div>
            <div className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-medium text-[#2563EB]">
              {members?.length ?? 0} online
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button onClick={() => editor.chain().focus().toggleBold().run()} data-testid="editor-bold" variant={editor.isActive('bold') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Bold className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleItalic().run()} data-testid="editor-italic" variant={editor.isActive('italic') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Italic className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleUnderline().run()} data-testid="editor-underline" variant={editor.isActive('underline') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><UnderlineIcon className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleStrike().run()} data-testid="editor-strike" variant={editor.isActive('strike') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Strikethrough className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleCode().run()} data-testid="editor-code" variant={editor.isActive('code') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Code className="w-4 h-4" /></Button>
          <div className="mx-1 h-6 w-px bg-[#E2E8F0]" />
          <Button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} data-testid="editor-h1" variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Heading1 className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} data-testid="editor-h2" variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Heading2 className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} data-testid="editor-h3" variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Heading3 className="w-4 h-4" /></Button>
          <div className="mx-1 h-6 w-px bg-[#E2E8F0]" />
          <Button onClick={() => editor.chain().focus().toggleBulletList().run()} data-testid="editor-bullet-list" variant={editor.isActive('bulletList') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><List className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} data-testid="editor-ordered-list" variant={editor.isActive('orderedList') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><ListOrdered className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().toggleBlockquote().run()} data-testid="editor-blockquote" variant={editor.isActive('blockquote') ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0"><Quote className="w-4 h-4" /></Button>
          <div className="mx-1 h-6 w-px bg-[#E2E8F0]" />
          <Button onClick={() => editor.chain().focus().undo().run()} data-testid="editor-undo" disabled={!editor.can().undo()} variant="ghost" size="sm" className="h-8 w-8 p-0"><Undo className="w-4 h-4" /></Button>
          <Button onClick={() => editor.chain().focus().redo().run()} data-testid="editor-redo" disabled={!editor.can().redo()} variant="ghost" size="sm" className="h-8 w-8 p-0"><Redo className="w-4 h-4" /></Button>
          <div className="flex-1" />
          <Button onClick={() => handleExport('docx')} disabled={exportingType !== ''} variant="outline" size="sm" className="rounded-xl border-blue-100 bg-white/90">
            <Download className="mr-2 h-4 w-4" />
            {exportingType === 'docx' ? 'Exporting...' : 'Export as Word'}
          </Button>
          <Button onClick={() => handleExport('pdf')} disabled={exportingType !== ''} variant="outline" size="sm" className="rounded-xl border-blue-100 bg-white/90">
            <Download className="mr-2 h-4 w-4" />
            {exportingType === 'pdf' ? 'Exporting...' : 'Export as PDF'}
          </Button>
          <Button onClick={prepareSelectionComment} variant="outline" size="sm" className="rounded-xl border-blue-100 bg-white/90">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Comment Selection
          </Button>
          <div className="flex items-center gap-2">
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs text-[#6366F1]">
                <User className="h-3 w-3" />
                <span>{Array.from(typingUsers).join(', ')} typing...</span>
              </div>
            )}
            {lastEditBy && <div className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs text-[#64748B]">Last edit by {lastEditBy}</div>}
            <div className="text-xs text-[#64748B]">
              {isSaving ? <span>Saving...</span> : lastSaved ? <span>Saved {lastSaved.toLocaleTimeString()}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-3 pb-3">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-b from-white to-[#F8FBFF] shadow-lg shadow-blue-100/50">
          <div className="border-b border-blue-100 px-8 py-5">
            <h1 className="border-b-2 border-transparent pb-2 text-4xl font-bold text-[#0F172A] outline-none focus:border-[#93C5FD]">{document.title}</h1>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl p-8">
              <div className="rounded-3xl border border-blue-100 bg-white/90 shadow-md shadow-blue-100/50">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
          {commentPopup && (
            <div
              className="glass-panel fixed z-50 w-72 rounded-2xl p-3"
              style={{ left: commentPopup.x - 140, top: commentPopup.y }}
            >
              <p className="mb-2 text-xs font-semibold text-[#1D4ED8]">Add inline comment</p>
              <p className="mb-2 line-clamp-2 rounded bg-[#EFF6FF] px-2 py-1 text-xs text-[#334155]">
                "{commentPopup.selected_text}"
              </p>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                className="mb-2 min-h-[72px] w-full rounded-xl border border-blue-100 bg-white/90 p-2 text-sm outline-none focus:border-[#93C5FD]"
                placeholder="Write a comment..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setCommentPopup(null); setPendingSelection(null); setCommentDraft(''); }}>Cancel</Button>
                <Button size="sm" onClick={handleCreateComment} disabled={isCommenting || !commentDraft.trim()} className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white">
                  {isCommenting ? 'Saving...' : 'Comment'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="glass-panel hidden w-[320px] shrink-0 rounded-3xl p-4 xl:block">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0F172A]">Comments</h3>
            <span className="rounded-full bg-[#DBEAFE] px-2 py-1 text-xs font-medium text-[#1D4ED8]">{comments.length}</span>
          </div>
          <div className="space-y-3">
            {pendingSelection && (
              <div className="rounded-2xl border border-blue-100 bg-white/85 p-3 shadow-sm">
                <p className="mb-1 text-xs font-semibold text-[#1D4ED8]">New inline comment</p>
                <p className="mb-2 rounded bg-[#EFF6FF] px-2 py-1 text-xs text-[#334155]">
                  "{pendingSelection.selected_text}"
                </p>
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="mb-2 min-h-[84px] w-full rounded-xl border border-blue-100 bg-white/90 p-2 text-sm outline-none focus:border-[#93C5FD]"
                  placeholder="Write your comment..."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setPendingSelection(null); setCommentDraft(''); }}>Cancel</Button>
                  <Button size="sm" onClick={handleCreateComment} disabled={isCommenting || !commentDraft.trim()} className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white">
                    {isCommenting ? 'Saving...' : 'Add Comment'}
                  </Button>
                </div>
              </div>
            )}
            {comments.length === 0 && (
              <p className="rounded-xl bg-white/75 px-3 py-2 text-sm text-[#64748B]">Select text to add your first comment.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.comment_id} className="rounded-2xl border border-blue-100 bg-white/85 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={comment.user_name} imageUrl={comment.user_picture} className="h-7 w-7" />
                    <p className="text-xs font-semibold text-[#2563EB]">{comment.user_name}</p>
                  </div>
                  <span className="text-[11px] text-[#64748B]">{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                {comment.selection_range?.selected_text && (
                  <p className="mb-2 rounded bg-[#EFF6FF] px-2 py-1 text-xs text-[#334155]">
                    "{comment.selection_range.selected_text}"
                  </p>
                )}
                <p className="text-sm text-[#334155]">{comment.text}</p>
                {String(comment.user_id) === String(currentUser?.user_id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.comment_id)}
                    className="mt-2 h-7 px-2 text-[#64748B] hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
