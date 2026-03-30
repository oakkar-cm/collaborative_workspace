import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Users, FileText, LogOut, Zap, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { getMe, logout as apiLogout } from '../api/endpoints/auth';
import { getWorkspaces, createWorkspace as apiCreateWorkspace, deleteWorkspace as apiDeleteWorkspace } from '../api/endpoints/workspaces';
import { getWorkspaceId, getWorkspaceCreatedAt } from '../api/utils';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleLogout = () => {
    apiLogout();
    toast.success('Logged out successfully');
    navigate('/');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-white to-[#EEF5FF]">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-glow absolute -left-16 top-20 h-72 w-72 rounded-full bg-[#60A5FA]/20 blur-3xl" />
        <div className="landing-glow absolute right-0 top-0 h-80 w-80 rounded-full bg-[#2563EB]/10 blur-3xl" />
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/70 backdrop-blur-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] shadow-lg shadow-blue-200/60">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">Synapse</h1>
                <p className="text-sm text-[#64748B]">Workspace Hub</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden rounded-2xl border border-blue-100 bg-white/80 px-4 py-2 text-xs text-[#2563EB] shadow-sm md:block">
                Workspace: Personal
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={user?.picture || 'https://via.placeholder.com/40'}
                  alt={user?.name}
                  className="w-10 h-10 rounded-full ring-2 ring-white"
                />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-[#0F172A]">{user?.name}</p>
                  <p className="text-xs text-[#64748B]">{user?.email}</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                data-testid="logout-button"
                variant="outline"
                size="sm"
                className="rounded-full border-blue-100 bg-white/80 hover:bg-blue-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-10">
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur-md">
            <p className="text-sm text-[#64748B]">Active Workspaces</p>
            <p className="mt-3 text-3xl font-bold text-[#0F172A]">{workspaces.length}</p>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur-md">
            <p className="text-sm text-[#64748B]">Tasks</p>
            <p className="mt-3 text-3xl font-bold text-[#0F172A]">{workspaces.length * 8}</p>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur-md">
            <p className="text-sm text-[#64748B]">Online Users</p>
            <p className="mt-3 text-3xl font-bold text-[#0F172A]">{Math.max(1, workspaces.length * 3)}</p>
          </div>
        </div>

        {/* Create Workspace Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-2">Workspaces</h2>
              <p className="text-[#64748B]">Create or join a workspace to start collaborating</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="create-workspace-button"
                  className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] px-6 py-2 text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:brightness-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-blue-100 bg-white/85 backdrop-blur-xl">
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

          {/* Workspaces Grid */}
          {workspaces.length === 0 ? (
            <div className="rounded-3xl border border-blue-100 bg-white/70 p-12 text-center shadow-lg shadow-blue-100/60 backdrop-blur-md">
              <div className="w-20 h-20 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-[#94A3B8]" />
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No workspaces yet</h3>
              <p className="text-[#64748B] mb-6">Create your first workspace to start collaborating with your team</p>
              <Button
                onClick={() => setDialogOpen(true)}
                data-testid="empty-state-create-button"
                className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] px-6 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div
                  key={getWorkspaceId(workspace)}
                  data-testid={`workspace-card-${getWorkspaceId(workspace)}`}
                  className="group relative cursor-pointer rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#60A5FA] hover:shadow-xl"
                >
                  <div onClick={() => navigate(`/workspace/${getWorkspaceId(workspace)}`)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA]">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-[#94A3B8]" />
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
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {workspaces.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            <div className="rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DBEAFE]">
                  <FileText className="w-5 h-5 text-[#2563EB]" />
                </div>
                <span className="text-2xl font-bold text-[#0F172A]">{workspaces.length}</span>
              </div>
              <p className="text-[#64748B]">Total Workspaces</p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DBEAFE]">
                  <Users className="w-5 h-5 text-[#2563EB]" />
                </div>
                <span className="text-2xl font-bold text-[#0F172A]">
                  {workspaces.reduce((sum, ws) => sum + (ws.members?.length ?? 0), 0)}
                </span>
              </div>
              <p className="text-[#64748B]">Team Members</p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DBEAFE]">
                  <Zap className="w-5 h-5 text-[#2563EB]" />
                </div>
                <span className="text-2xl font-bold text-[#0F172A]">Active</span>
              </div>
              <p className="text-[#64748B]">Status</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
