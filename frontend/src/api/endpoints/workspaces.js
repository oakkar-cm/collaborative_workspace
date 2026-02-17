import client from '../client';

export async function getWorkspaces() {
  const { data } = await client.get('/workspaces');
  return data;
}

export async function createWorkspace(name) {
  const { data } = await client.post('/workspaces', { name });
  return data;
}

export async function deleteWorkspace(workspaceId) {
  await client.delete(`/workspaces/${workspaceId}`);
}
