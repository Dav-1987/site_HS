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
    const err = new Error(data?.error || `Ошибка запроса (${res.status})`);
    err.status = res.status;
    // 'catalog' | 'settings' on a 409: saved from elsewhere since it was loaded.
    err.conflict = data?.conflict ?? null;
    throw err;
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

export function changePassword(currentPassword, newPassword) {
  return fetch('/api/admin/change-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).then(asJson);
}

export function fetchCatalog() {
  return fetch('/api/catalog', { method: 'GET' }).then(asJson);
}

/**
 * Saves the whole catalog; resolves to `{ categories, revision }`.
 * `baseRevision` is the revision it was loaded at — the server answers 409 if it
 * has been saved from elsewhere since. Left out, the save is not checked.
 */
export function saveCatalog(categories, baseRevision) {
  return fetch('/api/catalog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ categories, baseRevision }),
  }).then(asJson);
}

export function fetchSettings() {
  return fetch('/api/settings', { method: 'GET' }).then(asJson);
}

/** As saveCatalog, for the settings; resolves to `{ settings, revision }`. */
export function saveSettings(settings, baseRevision) {
  return fetch('/api/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ settings, baseRevision }),
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

/**
 * Загрузка скриншота отзыва. Отличается от uploadImage одним: сервер выбросит
 * оригинал, оставив только WebP-версии. Оригиналы товарных фото хранятся ради
 * фида Meta, который требует JPEG/PNG, — отзывы ни в один фид не попадают, и
 * держать рядом с каждым ещё по мегабайту незачем.
 */
export function uploadReviewImage(file) {
  return fetch('/api/upload?original=discard', {
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

/** List cart order requests (newest first). */
export function fetchOrders() {
  return fetch('/api/orders', { method: 'GET' }).then(asJson);
}

/**
 * Set an order's status and/or note — `{ status, note }`, either or both.
 * Saved on its own, not with «Сохранить». Returns `{ order }` as stored.
 */
export function updateOrder(id, patch) {
  return fetch(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then(asJson);
}

/** Delete an order request by id. */
export function deleteOrder(id) {
  return fetch(`/api/orders/${id}`, { method: 'DELETE' }).then(asJson);
}

/** Start a full rebuild + deploy (runs on GitHub Actions, not the VPS). */
export function triggerRebuild() {
  return fetch('/api/admin/rebuild', { method: 'POST' }).then(asJson);
}

/** `{ configured, run: { status, conclusion, url, createdAt } | null }` */
export function fetchRebuildStatus() {
  return fetch('/api/admin/rebuild/status', { method: 'GET' }).then(asJson);
}
