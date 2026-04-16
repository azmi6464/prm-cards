const FIREBASE_URL = 'https://prm-cards-default-rtdb.europe-west1.firebasedatabase.app';
let currentSlug = '', editMode = false, editingId = '', teamData = [];

const EI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
const CI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const DI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';

const apiGet = async () => {
  const r = await fetch(FIREBASE_URL + '/cards.json');
  if (!r.ok) return [];
  const d = await r.json();
  if (!d) return [];
  return Object.values(d).filter(Boolean);
};

const apiSave = async (data) => {
  const r = await fetch(FIREBASE_URL + '/cards/' + data.id + '.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return r.ok;
};

const apiDelete = async (id) => {
  const r = await fetch(FIREBASE_URL + '/cards/' + id + '.json', { method: 'DELETE' });
  return r.ok;
};

function toSlug(n) {
  return n.toLowerCase()
    .replace(/\u00fc/g, 'u').replace(/\u00f6/g, 'o').replace(/\u00e4/g, 'a')
    .replace(/\u00df/g, 'ss').replace(/\u011f/g, 'g').replace(/\u0131/g, 'i')
    .replace(/\u015f/g, 's').replace(/\u00e7/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function updateSlugPreview() {
  const n = document.getElementById('f-name').value.trim();
  const s = n ? toSlug(n) : '';
  document.getElementById('slug-preview').textContent = s ? 'card.html?id=' + s : 'ID will appear here';
}

function getInitials(n) {
  return n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getFormData() {
  return {
    name: document.getElementById('f-name').value.trim(),
    title: document.getElementById('f-title').value.trim(),
    company: document.getElementById('f-company').value.trim(),
    phone: document.getElementById('f-phone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    web: document.getElementById('f-web').value.trim(),
    linkedin: document.getElementById('f-linkedin').value.trim(),
    addr: document.getElementById('f-addr').value.trim(),
    photo: document.getElementById('f-photo').value.trim()
  };
}

function generateCard() {
  const data = getFormData();
  if (!data.name) { showToast('Please enter a name', true); return; }
  const slug = editMode ? editingId : toSlug(data.name);
  currentSlug = slug;
  document.getElementById('slug-preview').textContent = editMode ? 'Editing: ' + slug : 'card.html?id=' + slug;
  const url = window.location.origin + '/prm-cards/card.html?id=' + slug;
  const ra = document.getElementById('result-area');
  ra.innerHTML = '<div class="result-card">' +
    '<div class="result-header"><div style="display:flex;align-items:center;gap:12px">' +
    '<div class="result-avatar">' + getInitials(data.name) + '</div>' +
    '<div><div class="result-name">' + data.name + '</div>' +
    '<div class="result-title">' + (data.title || '') + '</div></div></div></div>' +
    '<div class="result-body"><div>' +
    '<div class="link-box"><div class="link-label">Permanent Card URL</div>' +
    '<div class="link-url"><span class="link-text">' + url + '</span>' +
    '<button class="link-copy" onclick="copyUrl()">Copy</button></div></div>' +
    '<div class="link-box"><div class="link-label">Card ID (Slug)</div>' +
    '<div class="link-url"><span class="link-text" style="font-family:monospace">' + slug + '</span>' +
    '<button class="link-copy" onclick="copySlug()">Copy</button></div></div>' +
    '<div class="action-row">' +
    '<a href="' + url + '" target="_blank" class="action-btn">Open Card</a>' +
    '<button class="action-btn" onclick="downloadQR()">Download QR</button>' +
    '<button class="action-btn" onclick="printQR()">Print QR</button>' +
    '</div></div>' +
    '<div class="qr-area"><div id="qr-display"></div>' +
    '<button class="qr-download" onclick="downloadQR()">Download PNG</button></div>' +
    '</div></div>';
  if (window.QRCode) {
    const el = document.getElementById('qr-display');
    el.innerHTML = '';
    new QRCode(el, { text: url, width: 140, height: 140 });
  }
}

async function saveCard() {
  const data = getFormData();
  if (!data.name) { showToast('Please enter a name', true); return; }
  const slug = editMode ? editingId : toSlug(data.name);
  data.id = slug;
  data.updatedAt = new Date().toISOString();
  const ok = await apiSave(data);
  if (ok) {
    showToast(editMode ? 'Card updated!' : 'Card saved!');
    if (!editMode) cancelEdit();
    loadTeam();
  } else {
    showToast('Save failed', true);
  }
}

function enterEditMode(id) {
  const m = teamData.find(x => x.id === id);
  if (!m) return;
  editMode = true;
  editingId = m.id;
  document.getElementById('f-name').value = m.name || '';
  document.getElementById('f-title').value = m.title || '';
  document.getElementById('f-company').value = m.company || 'Prominall GmbH';
  document.getElementById('f-phone').value = m.phone || '';
  document.getElementById('f-email').value = m.email || '';
  document.getElementById('f-web').value = m.web || '';
  document.getElementById('f-linkedin').value = m.linkedin || '';
  document.getElementById('f-addr').value = m.addr || '';
  document.getElementById('f-photo').value = m.photo || '';
  document.getElementById('edit-banner').style.display = 'block';
  document.getElementById('edit-banner').textContent = 'Editing: ' + m.name;
  document.getElementById('btn-cancel').style.display = 'block';
  document.getElementById('btn-update').style.display = 'block';
  document.getElementById('btn-save').style.display = 'none';
  document.getElementById('slug-preview').textContent = 'Editing: ' + m.id;
  document.querySelector('.sidebar').scrollTop = 0;
}

function cancelEdit() {
  editMode = false; editingId = '';
  ['f-name','f-title','f-phone','f-email','f-web','f-linkedin','f-addr','f-photo'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-company').value = 'Prominall GmbH';
  document.getElementById('edit-banner').style.display = 'none';
  document.getElementById('btn-cancel').style.display = 'none';
  document.getElementById('btn-update').style.display = 'none';
  document.getElementById('btn-save').style.display = 'block';
  document.getElementById('result-area').innerHTML = '';
  updateSlugPreview();
}

async function deleteMember(id) {
  if (!confirm('Delete this card?')) return;
  const ok = await apiDelete(id);
  if (ok) {
    showToast('Card deleted');
    if (editingId === id) cancelEdit();
    loadTeam();
  } else showToast('Delete failed', true);
}

function copyUrl() {
  if (currentSlug) navigator.clipboard.writeText(window.location.origin + '/prm-cards/card.html?id=' + currentSlug).then(() => showToast('URL copied!'));
}

function copySlug() {
  if (currentSlug) navigator.clipboard.writeText(currentSlug).then(() => showToast('Slug copied!'));
}

function copyUrl2(id) {
  const url = window.location.origin + '/prm-cards/card.html?id=' + id;
  navigator.clipboard.writeText(url).then(() => showToast('URL copied!'));
}

function downloadQR() {
  const c = document.querySelector('#qr-display canvas');
  if (!c) { showToast('Generate a card first', true); return; }
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = 'QR_' + currentSlug + '.png';
  a.click();
}

function printQR() {
  const c = document.querySelector('#qr-display canvas');
  if (!c) { showToast('Generate a card first', true); return; }
  const w = window.open('', '', 'width=400,height=500');
  w.document.write('<html><body style="text-align:center;padding:2rem"><img src="' + c.toDataURL() + '"></body></html>');
  w.print();
}

let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

async function loadTeam() {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = '<div class="loading-team">Loading...</div>';
  try {
    teamData = await apiGet();
    if (!teamData.length) {
      grid.innerHTML = '<div class="empty-state"><h3>No cards yet</h3><p>Create your first card using the form.</p></div>';
      document.getElementById('team-count').textContent = '';
      return;
    }
    document.getElementById('team-count').textContent = teamData.length + ' member' + (teamData.length !== 1 ? 's' : '');
    grid.innerHTML = '';
    teamData.forEach(m => {
      const d = document.createElement('div');
      d.className = 'team-card' + (editingId === m.id ? ' active-edit' : '');
      d.innerHTML = '<div style="display:flex;align-items:center;gap:12px">' +
        '<div class="team-avatar-sm">' + getInitials(m.name) + '</div>' +
        '<div class="team-info">' +
        '<div class="team-name">' + m.name + '</div>' +
        '<div class="team-role">' + (m.title || '') + '</div>' +
        '</div>' +
        '<div class="team-actions">' +
        '<button class="mini-btn" title="Edit" onclick="enterEditMode(' + "'" + m.id + "'" + ')">' + EI + '</button>' +
        '<button class="mini-btn" title="Copy URL" onclick="copyUrl2(' + "'" + m.id + "'" + ')">' + CI + '</button>' +
        '<button class="mini-btn delete-btn" title="Delete" onclick="deleteMember(' + "'" + m.id + "'" + ')">' + DI + '</button>' +
        '</div></div>';
      grid.appendChild(d);
    });
  } catch (e) {
    grid.innerHTML = '<div style="color:#A33D2D;padding:1rem;">Connection error.</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateSlugPreview();
  loadTeam();
});
