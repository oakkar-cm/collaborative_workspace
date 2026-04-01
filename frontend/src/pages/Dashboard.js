import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Users, FileText, LogOut, Zap, Trash2, LayoutGrid, CheckSquare2, MessageCircle, FolderKanban, Settings, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { getMe, logout as apiLogout } from '../api/endpoints/auth';
import { getWorkspaces, createWorkspace as apiCreateWorkspace, deleteWorkspace as apiDeleteWorkspace } from '../api/endpoints/workspaces';
import { getWorkspaceId, getWorkspaceCreatedAt } from '../api/utils';
import UserAvatar from '../components/UserAvatar';
import client from '../api/client';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [allFiles, setAllFiles] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, workspacesData] = await Promise.all([
        getMe(),
        getWorkspaces()
      ]);
      setUser(userData);
      setWorkspaces(workspacesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    setIsCreating(true);
    try {
      const created = await apiCreateWorkspace(newWorkspaceName);
      setWorkspaces([...workspaces, created]);
      setNewWorkspaceName('');
      setDialogOpen(false);
      toast.success('Workspace created!');
    } catch (error) {
      console.error('Failed to create workspace:', error);
      toast.error('Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout cleanly');
    } finally {
      navigate('/');
    }
  };

  const handleDeleteWorkspace = async (workspaceId, workspaceName) => {
    if (!window.confirm(`Are you sure you want to delete "${workspaceName}"? This will delete all documents, tasks, messages, and files in this workspace. This action cannot be undone.`)) {
      return;
    }

    try {
      await apiDeleteWorkspace(workspaceId);
      setWorkspaces(workspaces.filter(w => getWorkspaceId(w) !== workspaceId));
      toast.success('Workspace deleted successfully');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      toast.error(error.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.filename}"?`)) return;
    try {
      await client.delete(`/files/${file.file_id}`);
      setAllFiles((prev) => prev.filter((item) => item.file_id !== file.file_id));
      toast.success('File deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await client.get(`/files/${file.file_id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = file.filename || 'file';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const loadAllFiles = useCallback(async () => {
    if (workspaces.length === 0) {
      setAllFiles([]);
      return;
    }
    setSectionLoading(true);
    try {
      const responses = await Promise.all(
        workspaces.map((workspace) =>
          client.get(`/files?workspace_id=${getWorkspaceId(workspace)}`)
        )
      );
      const mappedFiles = responses.flatMap((res, idx) =>
        (res.data || []).map((file) => ({
          ...file,
          workspace_name: workspaces[idx]?.name || 'Workspace'
        }))
      );
      setAllFiles(mappedFiles);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setSectionLoading(false);
    }
  }, [workspaces]);

  const loadAllTasks = useCallback(async () => {
    if (workspaces.length === 0) {
      setAllTasks([]);
      return;
    }
    setSectionLoading(true);
    try {
      const responses = await Promise.all(
        workspaces.map((workspace) =>
          client.get(`/tasks?workspace_id=${getWorkspaceId(workspace)}`)
        )
      );
      const mappedTasks = responses.flatMap((res, idx) =>
        (res.data || []).map((task) => ({
          ...task,
          workspace_name: workspaces[idx]?.name || 'Workspace'
        }))
      );
      setAllTasks(mappedTasks);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setSectionLoading(false);
    }
  }, [workspaces]);

  const openChatPage = () => {
    if (workspaces.length === 0) {
      toast.error('Create a workspace first to open chat');
      return;
    }
    const workspaceId = getWorkspaceId(workspaces[0]);
    navigate(`/workspace/${workspaceId}?tab=chat`);
  };

  useEffect(() => {
    if (activeSection === 'files') {
      loadAllFiles();
    } else if (activeSection === 'tasks') {
      loadAllTasks();
    }
  }, [activeSection, loadAllFiles, loadAllTasks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  const recentDocuments = workspaces.slice(0, 5).map((workspace, index) => ({
    id: getWorkspaceId(workspace),
    title: `${workspace.name} Brief`,
    workspace: workspace.name,
    updatedAt: new Date(getWorkspaceCreatedAt(workspace)).toLocaleDateString(),
    initials: (workspace.name || 'W').slice(0, 2).toUpperCase(),
    collaborators: Math.max(1, (workspace.members?.length ?? 0) + (index % 3)),
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-white to-[#EEF5FF]">
      <div className="pointer-events-none absolute inset-0">
        <div className="floating-shape left-[-120px] top-12 h-80 w-80 bg-[#60A5FA]/35" />
        <div className="floating-shape right-[-140px] top-16 h-96 w-96 bg-[#2563EB]/18" />
        <div className="floating-shape bottom-[-80px] left-1/3 h-72 w-72 bg-[#3B82F6]/18" />
      </div>

      <div className="relative z-10 flex w-full gap-6 px-6 py-6">
        <aside className="glass-panel hidden w-[88px] shrink-0 rounded-[24px] p-3 lg:flex lg:flex-col lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] shadow-lg shadow-blue-200/60">
              <Zap className="h-6 w-6 text-white" />
            </div>
            {[
              { id: 'overview', Icon: LayoutGrid, onClick: () => setActiveSection('overview') },
              { id: 'files', Icon: FolderKanban, onClick: () => setActiveSection('files') },
              { id: 'tasks', Icon: CheckSquare2, onClick: () => setActiveSection('tasks') },
              { id: 'chat', Icon: MessageCircle, onClick: openChatPage }
            ].map(({ id, Icon, onClick }) => (
              <button
                key={id}
                type="button"
                onClick={onClick}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all hover:-translate-y-0.5 ${
                  activeSection === id
                    ? 'bg-[#DBEAFE] text-[#2563EB]'
                    : 'text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#64748B] transition-all hover:-translate-y-0.5 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={handleLogout}
            data-testid="logout-button"
            variant="ghost"
            size="sm"
            className="h-11 w-11 rounded-2xl p-0 text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </aside>

        <div className="w-full">
          <header className="glass-panel mb-6 flex items-center justify-between rounded-[24px] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] shadow-lg shadow-blue-200/60 lg:hidden">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">Synapse Workspace</h1>
                <p className="text-sm text-[#64748B]">Premium collaborative control center</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/settings')}
                variant="ghost"
                size="sm"
                className="rounded-full border border-blue-100 bg-white/80 text-[#64748B] hover:bg-blue-50 hover:text-[#2563EB]"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <div className="hidden rounded-2xl border border-blue-100 bg-white/80 px-4 py-2 text-xs text-[#2563EB] shadow-sm md:block">
                Workspace: Personal
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/80 px-3 py-2 shadow-sm">
                <UserAvatar
                  name={user?.name}
                  imageUrl={user?.avatar_url || user?.picture}
                  className="h-9 w-9 ring-2 ring-white"
                />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-[#0F172A]">{user?.name}</p>
                  <p className="text-xs text-[#64748B]">{user?.email}</p>
                </div>
              </div>
            </div>
          </header>

          <main>
            {activeSection === 'overview' && (
              <>
            <div className="mb-8 grid gap-5 md:grid-cols-3">
              <div className="surface-card p-6">
                <p className="text-sm text-[#64748B]">Active Projects</p>
                <p className="mt-3 text-3xl font-bold text-[#0F172A]">{workspaces.length}</p>
              </div>
              <div className="surface-card p-6">
                <p className="text-sm text-[#64748B]">Tasks</p>
                <p className="mt-3 text-3xl font-bold text-[#0F172A]">{workspaces.length * 8}</p>
              </div>
              <div className="surface-card p-6">
                <p className="text-sm text-[#64748B]">Online Members</p>
                <p className="mt-3 text-3xl font-bold text-[#0F172A]">{Math.max(1, workspaces.length * 3)}</p>
              </div>
            </div>

            <div className="mb-10 grid gap-6 xl:grid-cols-[2fr,1fr]">
              <section className="glass-panel rounded-[24px] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-[#0F172A]">Workspaces</h2>
                    <p className="text-[#64748B]">Create or join a workspace to start collaborating</p>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        data-testid="create-workspace-button"
                        className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] px-6 py-2 text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:brightness-105"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New Workspace
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md border-blue-100 bg-white/90 backdrop-blur-xl">
                      <DialogHeader>
                        <DialogTitle>Create New Workspace</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="workspace-name">Workspace Name</Label>
                          <Input
                            id="workspace-name"
                            data-testid="workspace-name-input"
                            placeholder="e.g., Marketing Team, Product Development"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                          />
                        </div>
                        <Button
                          onClick={handleCreateWorkspace}
                          data-testid="create-workspace-submit"
                          disabled={isCreating}
                          className="w-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white"
                        >
                          {isCreating ? 'Creating...' : 'Create Workspace'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {workspaces.length === 0 ? (
                  <div className="surface-card rounded-[22px] p-12 text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#F1F5F9]">
                      <Users className="h-10 w-10 text-[#94A3B8]" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-[#0F172A]">No workspaces yet</h3>
                    <p className="mb-6 text-[#64748B]">Create your first workspace to start collaborating with your team</p>
                    <Button
                      onClick={() => setDialogOpen(true)}
                      data-testid="empty-state-create-button"
                      className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] px-6 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Workspace
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {workspaces.map((workspace) => (
                      <div
                        key={getWorkspaceId(workspace)}
                        data-testid={`workspace-card-${getWorkspaceId(workspace)}`}
                        className="surface-card group relative cursor-pointer p-6"
                      >
                        <div onClick={() => navigate(`/workspace/${getWorkspaceId(workspace)}`)}>
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA]">
                              <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-[#94A3B8]" />
                              <span className="text-sm text-[#64748B]">{workspace.members?.length ?? 0}</span>
                            </div>
                          </div>
                          <h3 className="mb-2 text-lg font-semibold text-[#0F172A] transition-colors group-hover:text-[#2563EB]">
                            {workspace.name}
                          </h3>
                          <p className="text-sm text-[#64748B]">
                            Created {new Date(getWorkspaceCreatedAt(workspace)).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkspace(getWorkspaceId(workspace), workspace.name);
                          }}
                          data-testid={`delete-workspace-${getWorkspaceId(workspace)}`}
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <aside className="glass-panel rounded-[24px] p-6">
                <h3 className="mb-4 text-lg font-semibold text-[#0F172A]">Recent Documents</h3>
                <div className="space-y-3">
                  {recentDocuments.length === 0 ? (
                    <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-[#64748B]">No documents yet.</p>
                  ) : recentDocuments.map((doc) => (
                    <div key={doc.id} className="rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-xs font-semibold text-white">
                          {doc.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#0F172A]">{doc.title}</p>
                          <p className="truncate text-xs text-[#64748B]">{doc.workspace}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#64748B]">
                        <span>{doc.collaborators} collaborators</span>
                        <span>{doc.updatedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
              </>
            )}

            {activeSection === 'files' && (
              <section className="glass-panel mb-10 rounded-[24px] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#0F172A]">Uploaded Files</h2>
                  <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-medium text-[#1D4ED8]">
                    {allFiles.length} files
                  </span>
                </div>
                {sectionLoading ? (
                  <p className="text-sm text-[#64748B]">Loading files...</p>
                ) : allFiles.length === 0 ? (
                  <p className="rounded-xl bg-white/70 px-4 py-3 text-sm text-[#64748B]">
                    No uploaded files found across your workspaces.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {allFiles.map((file) => (
                      <div key={file.file_id} className="rounded-2xl border border-blue-100 bg-white/85 p-4 shadow-sm">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{file.filename}</p>
                        <p className="mt-1 text-xs text-[#64748B]">{file.workspace_name}</p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploaded_at).toLocaleDateString()}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadFile(file)}
                            className="h-8 rounded-lg border-blue-100 bg-white/90 text-[#334155] hover:bg-blue-50"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteFile(file)}
                            className="h-8 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeSection === 'tasks' && (
              <section className="glass-panel mb-10 rounded-[24px] p-6">
                <h2 className="mb-5 text-2xl font-bold text-[#0F172A]">All Tasks</h2>
                {sectionLoading ? (
                  <p className="text-sm text-[#64748B]">Loading tasks...</p>
                ) : (
                  <div className="grid gap-5 md:grid-cols-3">
                    {['todo', 'in_progress', 'done'].map((status) => {
                      const titleMap = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
                      const tasksByStatus = allTasks.filter((task) => task.status === status);
                      return (
                        <div key={status} className="rounded-2xl border border-blue-100 bg-white/80 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold text-[#0F172A]">{titleMap[status]}</h3>
                            <span className="rounded-full bg-[#DBEAFE] px-2 py-1 text-xs text-[#1D4ED8]">{tasksByStatus.length}</span>
                          </div>
                          <div className="space-y-3">
                            {tasksByStatus.length === 0 ? (
                              <p className="text-xs text-[#94A3B8]">No tasks</p>
                            ) : tasksByStatus.map((task) => (
                              <div key={task.task_id} className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
                                <p className="text-sm font-medium text-[#0F172A]">{task.title}</p>
                                {task.description ? <p className="mt-1 text-xs text-[#64748B]">{task.description}</p> : null}
                                <p className="mt-1 text-[11px] text-[#94A3B8]">{task.workspace_name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
