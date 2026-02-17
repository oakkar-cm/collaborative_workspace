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

  const handleLogout = async () => {
    try {
      await apiLogout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
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
      toast.error(error.response?.data?.detail || 'Failed to delete workspace');
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
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#6366F1] rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">Synapse</h1>
                <p className="text-sm text-[#64748B]">Your Workspaces</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
                className="rounded-full"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
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
                  className="bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-full px-6 py-2 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
                    className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white"
                  >
                    {isCreating ? 'Creating...' : 'Create Workspace'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Workspaces Grid */}
          {workspaces.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
              <div className="w-20 h-20 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-[#94A3B8]" />
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No workspaces yet</h3>
              <p className="text-[#64748B] mb-6">Create your first workspace to start collaborating with your team</p>
              <Button
                onClick={() => setDialogOpen(true)}
                data-testid="empty-state-create-button"
                className="bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-full px-6"
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
                  className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-card hover:shadow-card-hover hover:border-[#6366F1] hover:scale-[1.02] transition-all duration-200 cursor-pointer group relative"
                >
                  <div onClick={() => navigate(`/workspace/${getWorkspaceId(workspace)}`)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-[#94A3B8]" />
                        <span className="text-sm text-[#64748B]">{workspace.members?.length ?? 0}</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2 group-hover:text-[#6366F1] transition-colors">
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
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#6366F1]" />
                </div>
                <span className="text-2xl font-bold text-[#0F172A]">{workspaces.length}</span>
              </div>
              <p className="text-[#64748B]">Total Workspaces</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#FEF3F2] rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#F43F5E]" />
                </div>
                <span className="text-2xl font-bold text-[#0F172A]">
                  {workspaces.reduce((sum, ws) => sum + (ws.members?.length ?? 0), 0)}
                </span>
              </div>
              <p className="text-[#64748B]">Team Members</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-card hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#ECFDF5] rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#10B981]" />
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
