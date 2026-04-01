import client from '../client';

export async function getMe() {
  const { data } = await client.get('/me');
  return data;
}

export async function login(email, password) {
  const { data } = await client.post('/login', { email, password });
  return data;
}

export async function register({ email, firstName, lastName, password }) {
  const { data } = await client.post('/register', {
    email,
    firstName,
    lastName,
    password,
  });
  return data;
}

export async function logout() {
  await client.post('/logout');
}
