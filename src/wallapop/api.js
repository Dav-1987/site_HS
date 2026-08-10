const STATE_ENDPOINT = '/__local/wallapop-state';

async function asJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export function loadWallapopState() {
  return fetch(STATE_ENDPOINT, { method: 'GET', cache: 'no-store' }).then(asJson);
}

export function saveWallapopState(state) {
  return fetch(STATE_ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }).then(asJson);
}
