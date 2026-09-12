const API_BASE = '/gmls_api/endpoints';

function authToken() {
  return localStorage.getItem('gmls_token');
}

function setAuthToken(token) {
  if (token) localStorage.setItem('gmls_token', token);
  else localStorage.removeItem('gmls_token');
}

function currentUser() {
  const raw = localStorage.getItem('gmls_user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  if (user) localStorage.setItem('gmls_user', JSON.stringify(user));
  else localStorage.removeItem('gmls_user');
}

function logout() {
  setAuthToken(null);
  setCurrentUser(null);
}

async function unwrap(response) {
  let json;
  try {
    json = await response.json();
  } catch (e) {
    throw new Error(`Unexpected server response (${response.status})`);
  }
  if (json.success === true) return json.data ?? {};
  throw new Error(json.error || 'Something went wrong');
}

function headers(extra) {
  const token = authToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

const api = {
  async get(path, query) {
    const url = new URL(API_BASE + path, window.location.origin);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url, { headers: headers() });
    return unwrap(res);
  },

  async post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {}),
    });
    return unwrap(res);
  },

  async del(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'DELETE',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {}),
    });
    return unwrap(res);
  },

  async postForm(path, formData) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: headers(),
      body: formData,
    });
    return unwrap(res);
  },
};
