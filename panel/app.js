const statusEl = document.getElementById('status');
const projectPanelRawEl = document.getElementById('projectPanelRaw');
const runbookRawEl = document.getElementById('runbookRaw');
const refreshBtn = document.getElementById('refresh');
const toggleAllBtn = document.getElementById('toggleAll');
const notesEl = document.getElementById('notes');

const API = location.origin.endsWith(':5500') || location.origin.includes('file:')
  ? 'http://127.0.0.1:8787'
  : location.origin;

function setStatus(ok, msg) {
  statusEl.textContent = msg;
  statusEl.style.color = ok ? '#7ee787' : '#f78166';
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderNotes(projectPanel) {
  const notes = projectPanel.operator_notes || [];
  notesEl.innerHTML = notes
    .slice()
    .sort((a, b) => (b.priority || '').localeCompare(a.priority || '') || (b.timestamp || '').localeCompare(a.timestamp || ''))
    .map(n => {
      return `
      <div class="note">
        <div class="meta">
          <span><strong>${escapeHtml(n.priority || 'P?')}</strong></span>
          <span>${escapeHtml(n.timestamp || '')}</span>
          <span>${escapeHtml(n.id || '')}</span>
          ${n.scope ? `<span>scope=${escapeHtml(n.scope)}</span>` : ''}
        </div>
        <div class="msg">${escapeHtml(n.message || '')}</div>
      </div>`;
    })
    .join('');
}

async function loadAll() {
  try {
    const [ppRes, rbRes] = await Promise.all([
      fetch(`${API}/api/project-panel`),
      fetch(`${API}/api/runbook`),
    ]);

    if (!ppRes.ok || !rbRes.ok) {
      throw new Error(`HTTP ${ppRes.status}/${rbRes.status}`);
    }

    const projectPanel = await ppRes.json();
    const runbook = await rbRes.json();

    projectPanelRawEl.textContent = JSON.stringify(projectPanel, null, 2);
    runbookRawEl.textContent = JSON.stringify(runbook, null, 2);
    renderNotes(projectPanel);

    setStatus(true, 'connected');
  } catch (e) {
    setStatus(false, `disconnected (${e.message})`);
  }
}

function makeId(prefix) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${prefix}-${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}-${Math.random().toString(16).slice(2, 8)}`;
}

document.getElementById('noteForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const payload = {
    id: makeId('NOTE'),
    priority: fd.get('priority'),
    scope: fd.get('scope') || '',
    message: fd.get('message'),
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(`${API}/api/operator-notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    alert(`Failed: ${res.status}\n${txt}`);
    return;
  }

  ev.target.reset();
  await loadAll();
});

document.getElementById('decisionForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const payload = Object.fromEntries(fd.entries());

  const res = await fetch(`${API}/api/runbook/decisions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    alert(`Failed: ${res.status}\n${txt}`);
    return;
  }

  await loadAll();
});

refreshBtn.addEventListener('click', loadAll);

toggleAllBtn.addEventListener('click', () => {
  const all = Array.from(document.querySelectorAll('details.card'));
  const anyClosed = all.some(d => !d.open);
  all.forEach(d => { d.open = anyClosed; });
});

// Simple polling for "near-real-time" updates.
setInterval(loadAll, 2000);
loadAll();
