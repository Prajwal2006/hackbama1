import '@google/model-viewer';

const app = document.getElementById('app');
const catalog = await fetch('/catalog.json').then((r) => r.json());

// One hidden viewer renders a preview image per item, one at a time (keeps phone memory low).
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const posters = new Map();
let posterJob = Promise.resolve();
function renderPosters() {
  posterJob = posterJob.then(async () => {
    const todo = catalog.filter((i) => !posters.has(i.id));
    if (!todo.length) return;
    const mv = document.createElement('model-viewer');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('camera-orbit', '30deg 70deg auto');
    mv.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:240px;opacity:0;pointer-events:none;z-index:-1';
    document.body.append(mv);
    for (const item of todo) {
      try {
        mv.src = item.model;
        await new Promise((res, rej) => { mv.addEventListener('load', res, { once: true }); setTimeout(rej, 15000); });
        const blob = await mv.toBlob({ mimeType: 'image/png' });
        posters.set(item.id, URL.createObjectURL(blob));
        document.querySelectorAll('.poster[data-id="' + item.id + '"]').forEach((img) => { img.src = posters.get(item.id); });
      } catch { /* leave blank */ }
    }
    mv.remove();
  });
}

function showCatalog() {
  app.innerHTML = `
    <button class="ar-btn" id="scan-btn">+ Scan a new item with your camera</button>
    <p class="hint">Or tap an item, then "View in your room".</p>
    <div class="grid">${catalog.map((i) => `
      <button class="card" data-id="${i.id}">
        <img class="poster" data-id="${i.id}" alt="" src="${posters.get(i.id) || BLANK}">
        <b>${i.name}${i.scanned ? ' <small>(scanned)</small>' : ''}</b><span>${i.dimensionsCm.w} x ${i.dimensionsCm.d} x ${i.dimensionsCm.h} cm</span>
      </button>`).join('')}
    </div>`;
  renderPosters();
  document.getElementById('scan-btn').addEventListener('click', () => { location.hash = 'scan'; });
  app.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => { location.hash = c.dataset.id; }));
}

function showProduct(item) {
  const { w, d, h } = item.dimensionsCm;
  app.innerHTML = `
    <button class="back">&larr; All items</button>
    <model-viewer id="viewer" src="${item.model}" alt="${item.name}"
      camera-controls shadow-intensity="1" environment-image="neutral" exposure="1"
      ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed" ar-placement="${item.placement}">
      <button slot="ar-button" class="ar-btn">View in your room</button>
    </model-viewer>
    <p class="hint">Point your camera at the floor and move your phone slowly.</p>
    <div class="dims"><b>${item.name}</b><p>${item.description}</p>
      <p>W ${w} cm &times; D ${d} cm &times; H ${h} cm</p></div>
    <p class="msg" id="msg" hidden>AR isn't available on this device. Open this page on a recent phone to see it in your room.</p>
    <p id="dbg" style="font:11px monospace;color:#888;word-break:break-all"></p>`;
  app.querySelector('.back').addEventListener('click', () => { location.hash = ''; });
  const mv = document.getElementById('viewer');
  // canActivateAR is resolved asynchronously after load, so wait before deciding.
  mv.addEventListener('load', () => setTimeout(() => {
    const ok = mv.canActivateAR;
    document.getElementById('msg').hidden = ok;
    document.getElementById('dbg').textContent = 'canActivateAR=' + ok + ' | ' + navigator.userAgent;
  }, 1500));
  mv.addEventListener('ar-status', (e) => { document.getElementById('dbg').textContent += ' | ar-status=' + e.detail.status; });
  mv.addEventListener('quick-look-button-tapped', () => { document.getElementById('dbg').textContent += ' | QL tapped'; });
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Downscale a photo to a JPEG (max 1024px) so uploads stay small.
async function toJpeg(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

async function api(path, body) {
  const pass = sessionStorage.getItem('passcode') || '';
  const r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-passcode': pass }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('Wrong or missing passcode. Type it in the Passcode box above and try again.');
  if (!r.ok) throw new Error(data.error || 'Request failed (' + r.status + ')');
  return data;
}

function showScan() {
  const photos = [];
  app.innerHTML = `
    <button class="back">&larr; All items</button>
    <h2>Scan a new item</h2>
    <p class="hint">Take 1&ndash;4 photos of one piece of furniture from different angles. Keep the whole item in frame.</p>
    <label>Passcode<br><input id="pass" type="password" autocomplete="off" style="width:100%;font:inherit;padding:8px;margin-bottom:8px"></label>
    <label class="ar-btn" style="text-align:center">Take / add a photo
      <input id="file" type="file" accept="image/*" capture="environment" hidden></label>
    <div id="thumbs" style="display:flex;gap:8px;flex-wrap:wrap"></div>
    <button class="ar-btn" id="analyze" disabled>Analyze with Gemini</button>
    <p class="msg" id="status"></p>
    <form id="form" class="dims" hidden>
      <label>Name<br><input name="name" style="width:100%;font:inherit;padding:8px"></label>
      <p class="hint" id="desc"></p>
      <p class="hint">Check the real size (cm) &mdash; the model is scaled to exactly this:</p>
      <div style="display:flex;gap:8px">
        <label>W<input name="w" type="number" style="width:100%;font:inherit;padding:8px"></label>
        <label>D<input name="d" type="number" style="width:100%;font:inherit;padding:8px"></label>
        <label>H<input name="h" type="number" style="width:100%;font:inherit;padding:8px"></label>
      </div>
      <button class="ar-btn" type="submit">Build 3D model</button>
    </form>`;
  const $ = (id) => document.getElementById(id);
  const status = (t) => { $('status').textContent = t; };
  app.querySelector('.back').addEventListener('click', () => { location.hash = ''; });
  $('pass').value = sessionStorage.getItem('passcode') || '';
  $('pass').addEventListener('input', (e) => sessionStorage.setItem('passcode', e.target.value.trim()));
  $('file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f || photos.length >= 4) return;
    try {
      photos.push(await toJpeg(f));
      $('thumbs').innerHTML = photos.map((p) => `<img src="${p}" style="width:72px;height:72px;object-fit:cover;border-radius:8px">`).join('');
      $('analyze').disabled = false;
    } catch { status('Could not read that photo, try another.'); }
  });
  let spec = null;
  $('analyze').addEventListener('click', async () => {
    $('analyze').disabled = true; status('Gemini is looking at your photos… (about 10 seconds)');
    try {
      spec = await api('analyze', { images: photos });
      const f = $('form');
      f.name.value = spec.name; f.w.value = Math.round(spec.dimensionsCm.w); f.d.value = Math.round(spec.dimensionsCm.d); f.h.value = Math.round(spec.dimensionsCm.h);
      $('desc').textContent = spec.description + ' (' + spec.parts.length + ' parts)';
      f.hidden = false; status('');
    } catch (err) { status('Error: ' + err.message); }
    $('analyze').disabled = false;
  });
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; status('Building the 3D model…');
    try {
      const item = await api('build', { spec, name: f.name.value, description: spec.description,
        dimensionsCm: { w: +f.w.value, d: +f.d.value, h: +f.h.value } });
      catalog.push(item); location.hash = item.id;
    } catch (err) { status('Error: ' + err.message); }
  });
}

function route() {
  if (location.hash === '#scan') return showScan();
  const item = catalog.find((i) => i.id === location.hash.slice(1));
  item ? showProduct(item) : showCatalog();
}
window.addEventListener('hashchange', route);
route();
