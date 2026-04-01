import client from '../client';

export async function updateUser(userId, payload) {
  const { data } = await client.put(`/users/${userId}`, payload);
  return data;
}
