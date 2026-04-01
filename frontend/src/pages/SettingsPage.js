import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { getMe } from '../api/endpoints/auth';
import { updateUser } from '../api/endpoints/users';
import UserAvatar from '../components/UserAvatar';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    avatar_url: ''
  });
  const [password, setPassword] = useState('');

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await getMe();
        setProfile({
          user_id: me.user_id,
          first_name: me.first_name || '',
          last_name: me.last_name || '',
          email: me.email || '',
          avatar_url: me.avatar_url || ''
        });
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadMe();
  }, []);

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatar_url: reader.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile.user_id) return;
    setSaving(true);
    try {
      await updateUser(profile.user_id, {
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        password: password || undefined,
        avatarBase64: profile.avatar_url || ''
      });
      setPassword('');
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F8FBFF]" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FBFF] via-white to-[#EEF5FF] p-6">
      <div className="mx-auto max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4 rounded-full text-[#334155] hover:bg-blue-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="glass-panel rounded-[24px] p-8">
          <h1 className="mb-1 text-3xl font-bold text-[#0F172A]">User Settings</h1>
          <p className="mb-8 text-sm text-[#64748B]">Manage your profile details and account preferences.</p>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-white/80 p-4">
              <UserAvatar
                name={`${profile.first_name} ${profile.last_name}`.trim() || profile.email}
                imageUrl={profile.avatar_url}
                className="h-16 w-16"
              />
              <div>
                <Label htmlFor="avatar" className="mb-2 block">Profile picture</Label>
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-[#334155] hover:bg-blue-50">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload image
                  <input id="avatar" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={profile.first_name}
                  onChange={(e) => setProfile((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={profile.last_name}
                  onChange={(e) => setProfile((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="password">Change password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty to keep current password"
                className="mt-2"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
