// Thin client for the admin/catalog endpoints. Cookies (session) are
// sent automatically with same-origin requests.

async function asJson(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    throw new Error(data?.error || `Ошибка запроса (${res.status})`);
  }
  return data;
}

export function getAuthStatus() {
  return fetch('/api/admin/login', { method: 'GET' }).then(asJson);
}

export function login(password) {
  return fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  }).then(asJson);
}

export function logout() {
  return fetch('/api/admin/login', { method: 'DELETE' }).then(asJson);
}

export function fetchCatalog() {
  return fetch('/api/catalog', { method: 'GET' }).then(asJson);
}

export function saveCatalog(categories) {
  return fetch('/api/catalog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ categories }),
  }).then(asJson);
}

export function fetchSettings() {
  return fetch('/api/settings', { method: 'GET' }).then(asJson);
}

export function saveSettings(settings) {
  return fetch('/api/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ settings }),
  }).then(asJson);
}

/** Upload an image file; resolves to { url }. */
export function uploadImage(file) {
  return fetch('/api/upload', {
    method: 'POST',
    headers: { 'content-type': file.type },
    body: file,
  }).then(asJson);
}

/** Upload a video file (mp4/webm/mov, max 200 MB); resolves to { url }. */
export function uploadVideo(file) {
  return fetch('/api/upload', {
    method: 'POST',
    headers: { 'content-type': file.type },
    body: file,
  }).then(asJson);
}

/** List catalog snapshots (newest first). */
export function listVersions() {
  return fetch('/api/versions', { method: 'GET' }).then(asJson);
}

/** Restore a snapshot by id; resolves to the restored catalog. */
export function restoreVersion(id) {
  return fetch('/api/versions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  }).then(asJson);
}
