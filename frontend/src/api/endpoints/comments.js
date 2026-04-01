import client from '../client';

export async function getComments(documentId) {
  const { data } = await client.get(`/comments/${documentId}`);
  return data;
}

export async function createComment(payload) {
  const { data } = await client.post('/comments', payload);
  return data;
}

export async function deleteComment(commentId) {
  const { data } = await client.delete(`/comments/${commentId}`);
  return data;
}
