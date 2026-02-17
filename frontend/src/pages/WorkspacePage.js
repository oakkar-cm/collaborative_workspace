import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import io from 'socket.io-client';
import { 
  ArrowLeft, FileText, MessageSquare, CheckSquare, Upload, 
  Users, Send, Plus, Download, X, Check, Circle, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import CollaborativeEditor from '../components/CollaborativeEditor';
import VoiceChat from '../components/VoiceChat';
import Whiteboard from '../components/Whiteboard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SOCKET_PATH = "/api/socket.io";

const WorkspacePage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  
  // UI States
  const [activeDocument, setActiveDocument] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadInitialData();
    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };
  }, [workspaceId]);

  const loadInitialData = async () => {
    try {
      const [userRes, workspaceRes, docsRes, messagesRes, tasksRes, filesRes, membersRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/workspaces/${workspaceId}`, { withCredentials: true }),
        axios.get(`${API}/documents?workspace_id=${workspaceId}`, { withCredentials: true }),
        axios.get(`${API}/messages?workspace_id=${workspaceId}`, { withCredentials: true }),
        axios.get(`${API}/tasks?workspace_id=${workspaceId}`, { withCredentials: true }),
        axios.get(`${API}/files?workspace_id=${workspaceId}`, { withCredentials: true }),
        axios.get(`${API}/workspaces/${workspaceId}/members`, { withCredentials: true })
      ]);

      setCurrentUser(userRes.data);
      setWorkspace(workspaceRes.data);
      setDocuments(docsRes.data);
      setMessages(messagesRes.data);
      setTasks(tasksRes.data);
      setFiles(filesRes.data);
      setMembers(membersRes.data);

      if (docsRes.data.length > 0) {
        setActiveDocument(docsRes.data[0]);
      }

      // Initialize WebSocket
      initializeSocket();
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load workspace');
      navigate('/dashboard');
    }
  };

  const initializeSocket = () => {
    socketRef.current = io(BACKEND_URL, { path: SOCKET_PATH });

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket');
      socketRef.current.emit('join_room', { room_id: workspaceId });
    });

    socketRef.current.on('message', (data) => {
      setMessages(prev => [...prev, data]);
      scrollToBottom();
    });

    socketRef.current.on('task', (data) => {
      setTasks(prev => [...prev, data]);
      toast.success('New task created');
    });

    socketRef.current.on('task_update', (data) => {
      setTasks(prev => prev.map(t => t.task_id === data.task_id ? data : t));
    });

    socketRef.current.on('task_deleted', (data) => {
      setTasks(prev => prev.filter(t => t.task_id !== data.task_id));
      toast.info('A task was deleted');
    });

    socketRef.current.on('file', (data) => {
      setFiles(prev => [...prev, data]);
      toast.success('New file uploaded');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/documents`,
        { workspace_id: workspaceId, title: newDocTitle },
        { withCredentials: true }
      );

      setDocuments([...documents, response.data]);
      setActiveDocument(response.data);
      setNewDocTitle('');
      setShowNewDocDialog(false);
      toast.success('Document created!');
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error('Failed to create document');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      await axios.post(
        `${API}/messages`,
        { workspace_id: workspaceId, content: messageInput },
        { withCredentials: true }
      );
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      await axios.post(
        `${API}/tasks`,
        { 
          workspace_id: workspaceId, 
          title: newTaskTitle,
          description: newTaskDesc
        },
        { withCredentials: true }
      );

      setNewTaskTitle('');
      setNewTaskDesc('');
      setShowNewTaskDialog(false);
      toast.success('Task created!');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(
        `${API}/tasks/${taskId}`,
        { status: newStatus },
        { withCredentials: true }
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);

    setUploadingFile(true);
    try {
      await axios.post(
        `${API}/files/upload`,
        formData,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      toast.success('File uploaded!');
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDownloadFile = async (fileId, filename) => {
    try {
      const response = await axios.get(
        `${API}/files/${fileId}/download`,
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setInviting(true);
    try {
      const response = await axios.post(
        `${API}/workspaces/${workspaceId}/invite`,
        { email: inviteEmail },
        { withCredentials: true }
      );
      
      // Refresh members list
      const membersRes = await axios.get(
        `${API}/workspaces/${workspaceId}/members`,
        { withCredentials: true }
      );
      setMembers(membersRes.data);
      
      setInviteEmail('');
      setShowInviteDialog(false);
      toast.success(response.data.message);
    } catch (error) {
      console.error('Failed to invite user:', error);
      toast.error(error.response?.data?.detail || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(
        `${API}/documents/${docId}`,
        { withCredentials: true }
      );
      
      setDocuments(documents.filter(d => d.document_id !== docId));
      if (activeDocument?.document_id === docId) {
        setActiveDocument(documents.length > 1 ? documents[0] : null);
      }
      toast.success('Document deleted');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete document');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await axios.delete(
        `${API}/tasks/${taskId}`,
        { withCredentials: true }
      );
      
      setTasks(tasks.filter(t => t.task_id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/dashboard')}
                data-testid="back-to-dashboard"
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">{workspace?.name}</h1>
                <p className="text-sm text-[#64748B]">
                  {members.length} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowInviteDialog(true)}
                data-testid="invite-user-button"
                className="bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-full px-4 py-2 transition-all active:scale-95"
              >
                <Users className="w-4 h-4 mr-2" />
                Invite
              </Button>
              <div className="flex -space-x-2">
                {members.slice(0, 3).map((member) => (
                  <img
                    key={member.user_id}
                    src={member.picture || 'https://via.placeholder.com/32'}
                    alt={member.name}
                    title={member.name}
                    className="w-8 h-8 rounded-full ring-2 ring-white"
                  />
                ))}
                {members.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-[#6366F1] flex items-center justify-center text-white text-xs ring-2 ring-white">
                    +{members.length - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Three Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Documents */}
        <div className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0]">
            <Button
              onClick={() => setShowNewDocDialog(true)}
              data-testid="new-document-button"
              className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {documents.map(doc => (
              <div
                key={doc.document_id}
                data-testid={`document-${doc.document_id}`}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 shadow-sm group relative ${
                  activeDocument?.document_id === doc.document_id
                    ? 'bg-[#EEF2FF] border border-[#6366F1] shadow-card scale-[1.02]'
                    : 'hover:bg-[#F8F9FA] border border-transparent hover:shadow-card hover:scale-[1.02]'
                }`}
              >
                <div 
                  onClick={() => setActiveDocument(doc)}
                  className="flex items-start gap-2"
                >
                  <FileText className="w-4 h-4 text-[#6366F1] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(doc.document_id);
                  }}
                  data-testid={`delete-doc-${doc.document_id}`}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Editor/Chat/Tasks */}
        <div className="flex-1 flex flex-col bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start border-b border-[#E2E8F0] rounded-none bg-transparent p-0">
              <TabsTrigger 
                value="editor" 
                data-testid="tab-editor"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] rounded-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger 
                value="whiteboard"
                data-testid="tab-whiteboard"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] rounded-none"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Whiteboard
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                data-testid="tab-chat"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] rounded-none"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="tasks"
                data-testid="tab-tasks"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] rounded-none"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Tasks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="flex-1 overflow-hidden m-0 p-0">
              {activeDocument ? (
                <CollaborativeEditor 
                  document={activeDocument} 
                  workspaceId={workspaceId}
                  socket={socketRef.current}
                  currentUser={currentUser}
                  members={members}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                      No document selected
                    </h3>
                    <p className="text-[#64748B] mb-4">
                      Create a new document or select one from the sidebar
                    </p>
                    <Button
                      onClick={() => setShowNewDocDialog(true)}
                      className="bg-[#6366F1] hover:bg-[#5558E3] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Document
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="whiteboard" className="flex-1 overflow-hidden m-0 p-0">
              <Whiteboard
                workspaceId={workspaceId}
                socket={socketRef.current}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(msg => (
                  <div 
                    key={msg.message_id}
                    data-testid={`message-${msg.message_id}`}
                    className="flex gap-3 animate-fade-in"
                  >
                    <img
                      src={msg.user_picture || 'https://via.placeholder.com/40'}
                      alt={msg.user_name}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-[#0F172A]">{msg.user_name}</span>
                        <span className="text-xs text-[#94A3B8] text-mono">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[#0F172A]">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Voice Chat Component */}
              <VoiceChat 
                socket={socketRef.current}
                workspaceId={workspaceId}
                currentUser={currentUser}
                members={members}
              />
              
              <div className="border-t border-[#E2E8F0] p-4">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    data-testid="chat-input"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    data-testid="send-message-button"
                    className="bg-[#6366F1] hover:bg-[#5558E3] text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 overflow-auto m-0 p-6">
              <div className="mb-4">
                <Button
                  onClick={() => setShowNewTaskDialog(true)}
                  data-testid="new-task-button"
                  className="bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-md transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Todo Column */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Circle className="w-5 h-5 text-[#94A3B8]" />
                    <h3 className="font-semibold text-[#0F172A]">To Do</h3>
                    <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-full">
                      {todoTasks.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {todoTasks.map(task => (
                      <TaskCard 
                        key={task.task_id} 
                        task={task} 
                        onStatusChange={handleUpdateTaskStatus}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>

                {/* In Progress Column */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Circle className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
                    <h3 className="font-semibold text-[#0F172A]">In Progress</h3>
                    <span className="text-xs text-[#64748B] bg-[#FEF3C7] px-2 py-1 rounded-full">
                      {inProgressTasks.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {inProgressTasks.map(task => (
                      <TaskCard 
                        key={task.task_id} 
                        task={task} 
                        onStatusChange={handleUpdateTaskStatus}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>

                {/* Done Column */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Check className="w-5 h-5 text-[#10B981]" />
                    <h3 className="font-semibold text-[#0F172A]">Done</h3>
                    <span className="text-xs text-[#64748B] bg-[#ECFDF5] px-2 py-1 rounded-full">
                      {doneTasks.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {doneTasks.map(task => (
                      <TaskCard 
                        key={task.task_id} 
                        task={task} 
                        onStatusChange={handleUpdateTaskStatus}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Files */}
        <div className="w-80 bg-white border-l border-[#E2E8F0] flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              data-testid="upload-file-button"
              className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-md transition-all active:scale-95"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadingFile ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Files</h3>
            <div className="space-y-2">
              {files.map(file => (
                <div
                  key={file.file_id}
                  data-testid={`file-${file.file_id}`}
                  className="p-3 rounded-lg border border-[#E2E8F0] hover:border-[#6366F1] shadow-sm hover:shadow-card hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {file.filename}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-xs text-[#94A3B8] text-mono">
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleDownloadFile(file.file_id, file.filename)}
                      data-testid={`download-file-${file.file_id}`}
                      size="sm"
                      variant="ghost"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Document Dialog */}
      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Document Title</Label>
              <Input
                id="doc-title"
                data-testid="new-doc-title-input"
                placeholder="e.g., Meeting Notes, Project Plan"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
              />
            </div>
            <Button
              onClick={handleCreateDocument}
              data-testid="create-document-submit"
              className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white"
            >
              Create Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                data-testid="new-task-title-input"
                placeholder="e.g., Review design mockups"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Textarea
                id="task-desc"
                data-testid="new-task-desc-input"
                placeholder="Add task details..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleCreateTask}
              data-testid="create-task-submit"
              className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white"
            >
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User to Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                data-testid="invite-email-input"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInviteUser()}
              />
              <p className="text-xs text-[#64748B]">
                The user must have an account to be added to this workspace.
              </p>
            </div>
            
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Current Members ({members.length})</Label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {members.map((member) => (
                    <div 
                      key={member.user_id} 
                      className="flex items-center gap-3 p-2 rounded-md bg-[#F8F9FA]"
                    >
                      <img
                        src={member.picture || 'https://via.placeholder.com/32'}
                        alt={member.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-[#64748B] truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              onClick={handleInviteUser}
              data-testid="invite-user-submit"
              disabled={inviting}
              className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white"
            >
              {inviting ? 'Inviting...' : 'Invite User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task, onStatusChange, onDelete }) => {
  const [localStatus, setLocalStatus] = React.useState(task.status || 'todo');

  React.useEffect(() => {
    setLocalStatus(task.status || 'todo');
  }, [task.status]);

  const handleStatusChange = (newStatus) => {
    setLocalStatus(newStatus);
    onStatusChange(task.task_id, newStatus);
  };

  return (
    <div 
      data-testid={`task-card-${task.task_id}`}
      className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200 group relative"
    >
      <h4 className="font-medium text-[#0F172A] mb-2 pr-8">{task.title}</h4>
      {task.description && (
        <p className="text-sm text-[#64748B] mb-3">{task.description}</p>
      )}
      <Select
        value={localStatus}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-full" data-testid={`task-status-${task.task_id}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">To Do</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>
      <Button
        onClick={() => onDelete(task.task_id)}
        data-testid={`delete-task-${task.task_id}`}
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default WorkspacePage;
