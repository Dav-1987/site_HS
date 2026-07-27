// "Пересобрать сайт" — admin-triggered rebuild + deploy, run on GitHub's
// Actions runner rather than the VPS itself. The VPS is a small shared box
// (1 vCPU, ~2 GB RAM already swapping under normal load, disk >90% full,
// alongside several unrelated Docker services) — running `vite build` there
// risked starving those other services or filling the disk mid-build. See
// .github/workflows/rebuild-deploy.yml for what actually runs.
//
// Env: GH_REBUILD_TOKEN — a fine-grained GitHub PAT scoped to this repo only,
// with Actions: Read and write. Without it, the feature is simply unavailable
// (rebuildConfigured() false) rather than erroring.

const OWNER = 'Dav-1987';
const REPO = 'site_HS';
const WORKFLOW_FILE = 'rebuild-deploy.yml';
const API = 'https://api.github.com';

export function rebuildConfigured() {
  return Boolean(process.env.GH_REBUILD_TOKEN);
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.GH_REBUILD_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** Start a rebuild. Resolves once GitHub has accepted the dispatch — the run itself takes minutes; poll getLatestRun() for progress. */
export async function triggerRebuild() {
  const res = await fetch(
    `${API}/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`GitHub dispatch ${res.status}: ${t.slice(0, 300)}`);
  }
}

/**
 * The most recent run of the rebuild workflow, whoever triggered it (this
 * button, another admin, or manually from GitHub) — simpler and more robust
 * than trying to track "the run our dispatch just created", since the
 * dispatch API doesn't hand back a run id and the run can take a few seconds
 * to appear. The caller compares `createdAt` against its own click time to
 * tell "still starting" from "an older run".
 */
export async function getLatestRun() {
  const res = await fetch(
    `${API}/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`,
    { headers: headers(), signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`GitHub runs ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const run = data.workflow_runs?.[0];
  if (!run) return null;
  return {
    status: run.status, // queued | in_progress | completed
    conclusion: run.conclusion, // success | failure | cancelled | ... | null while running
    url: run.html_url,
    createdAt: run.created_at,
  };
}
