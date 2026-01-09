const statusEl = document.getElementById('status');
const projectPanelRawEl = document.getElementById('projectPanelRaw');
const runbookRawEl = document.getElementById('runbookRaw');
const refreshBtn = document.getElementById('refresh');
const toggleAllBtn = document.getElementById('toggleAll');
const notesEl = document.getElementById('notes');
const milestonesEl = document.getElementById('milestones');
const decisionsEl = document.getElementById('decisions');
const decisionsPendingEl = document.getElementById('decisionsPending');
const runbookStepsEl = document.getElementById('runbookSteps');
const runbookCheckpointsEl = document.getElementById('runbookCheckpoints');

const milestoneFormEl = document.getElementById('milestoneForm');
const milestoneIdSelectEl = document.getElementById('milestoneIdSelect');
const milestoneIdInputEl = document.getElementById('milestoneIdInput');
const milestoneStatusEl = document.getElementById('milestoneStatus');
const milestoneSummaryEl = document.getElementById('milestoneSummary');
const milestoneEvidenceEl = document.getElementById('milestoneEvidence');
const milestoneDateEl = document.getElementById('milestoneDate');

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

let lastProjectPanelCompact = null;
let lastRunbookCompact = null;

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

function getMilestoneIdFromForm() {
  const typed = (milestoneIdInputEl?.value || '').trim();
  const selected = (milestoneIdSelectEl?.value || '').trim();
  return typed || selected;
}

function setMilestoneFormValues(m) {
  if (!m) return;
  if (milestoneStatusEl) milestoneStatusEl.value = m.status || '';
  if (milestoneSummaryEl) milestoneSummaryEl.value = m.summary || '';
  if (milestoneEvidenceEl) milestoneEvidenceEl.value = m.evidence || '';
  if (milestoneDateEl) milestoneDateEl.value = m.date || '';
}

function populateMilestoneSelect(milestones) {
  if (!milestoneIdSelectEl) return;

  const current = (milestoneIdSelectEl.value || '').trim();
  const options = milestones
    .slice()
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
    .map(m => {
      const id = String(m.id || '').trim();
      const status = String(m.status || '').trim();
      const label = status ? `${id} (${status})` : id;
      return { id, label };
    })
    .filter(o => o.id);

  milestoneIdSelectEl.innerHTML = '<option value="" selected>(selecionar existente)</option>' + options
    .map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.label)}</option>`)
    .join('');

  // Best-effort: preserve current selection if it still exists.
  if (current && options.some(o => o.id === current)) {
    milestoneIdSelectEl.value = current;
  }
}

function renderMilestones(projectPanel) {
  if (!milestonesEl) return;
  const milestones = projectPanel.milestones || [];
  populateMilestoneSelect(milestones);

  milestonesEl.innerHTML = milestones
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(m => {
      return `
      <div class="note">
        <div class="meta">
          <span><strong>${escapeHtml(m.status || 'unknown')}</strong></span>
          <span>${escapeHtml(m.date || '')}</span>
          <span>${escapeHtml(m.id || '')}</span>
        </div>
        <div class="msg">${escapeHtml(m.summary || '')}</div>
        ${m.evidence ? `<div class="muted" style="margin-top: 6px; font-size: 11px;">Evidence: ${escapeHtml(m.evidence)}</div>` : ''}
      </div>`;
    })
    .join('');
}

function renderDecisions(runbook) {
  if (!decisionsEl) return;
  const decisions = runbook.decisions || [];
  decisionsEl.innerHTML = decisions
    .slice()
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .map(d => {
      return `
      <div class="note">
        <div class="meta">
          <span><strong>${escapeHtml(d.scope || '')}</strong></span>
          <span>${escapeHtml(d.timestamp || '')}</span>
          <span>${escapeHtml(d.id || '')}</span>
          <span>approved by: ${escapeHtml(d.approved_by || '')}</span>
        </div>
        <div class="msg">
          <strong>Change:</strong> ${escapeHtml(d.change_summary || '')}<br>
          <strong>Reason:</strong> ${escapeHtml(d.reason || '')}<br>
          <strong>Atomic unit:</strong> ${escapeHtml(d.atomic_unit || '')}<br>
          <strong>Idempotency:</strong> ${escapeHtml(d.idempotency_note || '')}
        </div>
      </div>`;
    })
    .join('');
}

function renderDecisionsPending(projectPanel) {
  if (!decisionsPendingEl) return;
  const pending = projectPanel.decisions_pending || [];
  if (pending.length === 0) {
    decisionsPendingEl.innerHTML = '<div class="muted">No pending decisions</div>';
    return;
  }
  decisionsPendingEl.innerHTML = pending
    .map(d => {
      return `
      <div class="note">
        <div class="meta">
          <span><strong>PENDING</strong></span>
          ${d.scope ? `<span>scope=${escapeHtml(d.scope)}</span>` : ''}
          ${d.timestamp ? `<span>${escapeHtml(d.timestamp)}</span>` : ''}
        </div>
        <pre class="pre">${escapeHtml(JSON.stringify(d, null, 2))}</pre>
      </div>`;
    })
    .join('');
}

function renderRunbookSteps(runbook) {
  if (!runbookStepsEl) return;
  const steps = runbook.steps || [];
  if (!Array.isArray(steps) || steps.length === 0) {
    runbookStepsEl.innerHTML = '<div class="muted">No steps</div>';
    return;
  }

  runbookStepsEl.innerHTML = steps
    .map((s, idx) => {
      return `
      <div class="note">
        <div class="meta">
          <span><strong>STEP ${idx + 1}</strong></span>
        </div>
        <div class="msg">${escapeHtml(String(s || ''))}</div>
      </div>`;
    })
    .join('');
}

function renderRunbookCheckpoints(runbook) {
  if (!runbookCheckpointsEl) return;
  const cps = runbook.checkpoints || [];
  if (!Array.isArray(cps) || cps.length === 0) {
    runbookCheckpointsEl.innerHTML = '<div class="muted">No checkpoints</div>';
    return;
  }

  runbookCheckpointsEl.innerHTML = cps
    .slice()
    // Natural order for IDs: ascending
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
    .map(cp => {
      return `
      <div class="note">
        <div class="meta">
          <span><strong>${escapeHtml(cp.id || '')}</strong></span>
          ${cp.scope ? `<span>scope=${escapeHtml(cp.scope)}</span>` : ''}
          ${cp.language ? `<span>lang=${escapeHtml(cp.language)}</span>` : ''}
        </div>
        <div class="msg">${escapeHtml(cp.title || '')}</div>
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

    const ppCompact = JSON.stringify(projectPanel);
    const rbCompact = JSON.stringify(runbook);

    const ppChanged = ppCompact !== lastProjectPanelCompact;
    const rbChanged = rbCompact !== lastRunbookCompact;

    if (ppChanged) {
      lastProjectPanelCompact = ppCompact;
      projectPanelRawEl.textContent = JSON.stringify(projectPanel, null, 2);
      renderNotes(projectPanel);
      renderMilestones(projectPanel);
      renderDecisionsPending(projectPanel);
    }

    if (rbChanged) {
      lastRunbookCompact = rbCompact;
      runbookRawEl.textContent = JSON.stringify(runbook, null, 2);
      renderDecisions(runbook);
      renderRunbookSteps(runbook);
      renderRunbookCheckpoints(runbook);
    }

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

  // Prevent accidental resubmission of the same decision payload.
  ev.target.reset();
  await loadAll();
});

if (milestoneFormEl) {
  milestoneFormEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const id = getMilestoneIdFromForm();
    if (!id) {
      alert('Informe um milestone id (selecione ou digite).');
      return;
    }

    // Safety-first: only send fields the operator actually filled.
    // This prevents accidentally clearing existing milestone fields.
    const payload = { id };
    const status = (milestoneStatusEl?.value ?? '').trim();
    const summary = (milestoneSummaryEl?.value ?? '').trim();
    const evidence = (milestoneEvidenceEl?.value ?? '').trim();
    const date = (milestoneDateEl?.value ?? '').trim();
    if (status) payload.status = status;
    if (summary) payload.summary = summary;
    if (evidence) payload.evidence = evidence;
    if (date) payload.date = date;

    const res = await fetch(`${API}/api/project-panel/milestones/upsert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      alert(`Failed: ${res.status}\n${txt}`);
      return;
    }

    // Clear typed id and other fields to avoid stale data on next save.
    if (milestoneIdInputEl) milestoneIdInputEl.value = '';
    if (milestoneStatusEl) milestoneStatusEl.value = '';
    if (milestoneSummaryEl) milestoneSummaryEl.value = '';
    if (milestoneEvidenceEl) milestoneEvidenceEl.value = '';
    if (milestoneDateEl) milestoneDateEl.value = '';
    await loadAll();
  });
}

if (milestoneIdSelectEl) {
  milestoneIdSelectEl.addEventListener('change', async () => {
    if (!milestoneIdSelectEl.value) return;
    if (milestoneIdInputEl) milestoneIdInputEl.value = '';

    try {
      const ppRes = await fetch(`${API}/api/project-panel`);
      if (!ppRes.ok) return;
      const projectPanel = await ppRes.json();
      const milestones = projectPanel.milestones || [];
      const selectedId = String(milestoneIdSelectEl.value || '').trim();
      const m = milestones.find(x => String(x?.id || '').trim() === selectedId);
      setMilestoneFormValues(m);
    } catch {
      // ignore
    }
  });
}

refreshBtn.addEventListener('click', loadAll);

toggleAllBtn.addEventListener('click', () => {
  const all = Array.from(document.querySelectorAll('details.card'));
  const anyClosed = all.some(d => !d.open);
  all.forEach(d => { d.open = anyClosed; });
});

// Simple polling for "near-real-time" updates.
setInterval(loadAll, 2000);
loadAll();
