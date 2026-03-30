// ── i18n ───────────────────────────────────────────────────────────────────
const LANGS = {
  sr: {
    title:            '🧾 Provera Fiskalnog Računa',
    subtitle:         'Skeniraj QR kod sa fiskalnog računa, odmah preuzmite PDF sa PDV-om ako je racun validan.',
    dropClick:        'Kliknite za upload',
    dropOr:           'ili prevucite',
    dropHint:         'JPEG, PNG, WebP — do 20 MB',
    btnBackCam:       'Zadnja kamera',
    btnFrontCam:      'Veb kamera / prednja',
    btnScan:          'Skeniraj račun',
    btnDownload:      '⬇ Preuzmi PDF',
    emailPlaceholder: 'Pošalji na email adresu…',
    btnEmailSend:     'Pošalji',
    camTitleBack:     'Zadnja kamera',
    camTitleFront:    'Veb kamera / prednja',
    camDenied:        'Pristup kameri je odbijen. Dozvolite pristup u podešavanjima pregledača.',
    camError:         'Nije moguće otvoriti kameru',
    camCaptureBtn:    'Uslikaj',
    camSwitchBtn:     '⇄ Promeni kameru',
    cropBtnLabel:     'Iseci',
    cropTitle:        'Iseci sliku',
    cropHint:         'Prevucite da odaberete oblast koju želite da zadržite',
    cropApply:        'Primeni isecanje',
    cropReset:        'Resetuj',
    statusLoading:    'Prepoznavanje QR koda i preuzimanje podataka o računu…',
    statusSuccess:    'Račun uspešno skeniran! Kliknite ispod da preuzmete PDF.',
    statusServerErr:  'Neočekivana greška servera.',
    statusUnknown:    'Došlo je do nepoznate greške.',
    statusNoServer:   'Nije moguće dosegnuti server. Proverite internet konekciju.',
    emailNoAddr:      'Unesite email adresu.',
    emailNoPdf:       'Nema PDF-a za slanje — najpre skenirajte račun.',
    emailSent:        'Email uspešno poslat!',
    emailFail:        'Slanje emaila nije uspelo.',
    emailNoServer:    'Nije moguće dosegnuti server.',
    emailSpam:        'Proverite folder za neželjenu poštu ako ga ne vidite.',
  },
  en: {
    title:            '🧾 Fiscal Receipt Checker',
    subtitle:         'Upload a photo of any Serbian fiscal receipt QR code, get a PDF with PDV instantly.',
    dropClick:        'Click to upload',
    dropOr:           'or drag & drop',
    dropHint:         'JPEG, PNG, WebP - up to 20 MB',
    btnBackCam:       'Back camera',
    btnFrontCam:      'Webcam / front',
    btnScan:          'Scan Receipt',
    btnDownload:      '⬇ Download PDF',
    emailPlaceholder: 'Send to email address…',
    btnEmailSend:     'Send',
    camTitleBack:     'Back camera',
    camTitleFront:    'Webcam / Front camera',
    camDenied:        'Camera access was denied. Please allow camera access in your browser settings.',
    camError:         'Could not open camera',
    camCaptureBtn:    'Capture photo',
    camSwitchBtn:     '⇄ Switch camera',
    cropBtnLabel:     'Crop',
    cropTitle:        'Crop Image',
    cropHint:         'Drag to select the area you want to keep',
    cropApply:        'Apply Crop',
    cropReset:        'Reset',
    statusLoading:    'Detecting QR code and fetching receipt data…',
    statusSuccess:    'Receipt scanned successfully! Click below to download your PDF.',
    statusServerErr:  'Unexpected server error.',
    statusUnknown:    'An unknown error occurred.',
    statusNoServer:   'Could not reach the server. Please check your connection.',
    emailNoAddr:      'Please enter an email address.',
    emailNoPdf:       'No PDF to send — scan a receipt first.',
    emailSent:        'Email sent!',
    emailFail:        'Failed to send email.',
    emailNoServer:    'Could not reach the server.',
    emailSpam:        'Check your spam folder if you don\'t see it.',
  },
};

let currentLang = localStorage.getItem('lang') || 'sr';

function t(key) { return LANGS[currentLang][key] || key; }

function setLang(code) {
  currentLang = code;
  localStorage.setItem('lang', code);
  document.documentElement.lang = code;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.title = LANGS[code].title.replace('🧾 ', '');
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === code);
  });
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

setLang(currentLang);

// ── State ──────────────────────────────────────────────────────────────────
let selectedFile = null;
let pdfBlob = null;
let pdfFilename = 'receipt.pdf';

const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const previewWrap = document.getElementById('preview-wrap');
const previewImg  = document.getElementById('preview-img');
const clearBtn    = document.getElementById('clear-btn');
const scanBtn     = document.getElementById('scan-btn');
const statusEl    = document.getElementById('status');
const statusText  = document.getElementById('status-text');
const spinner     = document.getElementById('spinner');
const downloadBtn = document.getElementById('download-btn');
const emailSection = document.getElementById('email-section');

// ── File helpers ───────────────────────────────────────────────────────────
function setFile(file) {
  if (!file) return;
  selectedFile = file;
  previewImg.src = URL.createObjectURL(file);
  previewWrap.style.display = 'block';
  scanBtn.disabled = false;
  hideStatus();
  downloadBtn.style.display = 'none';
  emailSection.classList.remove('visible');
  pdfBlob = null;
}

function clearFile() {
  selectedFile = null;
  previewImg.src = '';
  previewWrap.style.display = 'none';
  scanBtn.disabled = true;
  fileInput.value = '';
  hideStatus();
  downloadBtn.style.display = 'none';
  emailSection.classList.remove('visible');
  pdfBlob = null;
}

// ── Drop zone ──────────────────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) setFile(f);
});
clearBtn.addEventListener('click', clearFile);

// ── Camera modal ───────────────────────────────────────────────────────────
const camModal   = document.getElementById('cam-modal');
const camTitle   = document.getElementById('cam-modal-title');
const camVideo   = document.getElementById('cam-video');
const camCanvas  = document.getElementById('cam-canvas');
const camCapture = document.getElementById('cam-capture');
const camClose   = document.getElementById('cam-close');
const camSwitch  = document.getElementById('cam-switch');
const camError   = document.getElementById('cam-error');

let camStream = null;
let camFacingMode = 'environment';

async function openCamera(facingMode) {
  camFacingMode = facingMode;
  camTitle.textContent = facingMode === 'user' ? t('camTitleFront') : t('camTitleBack');
  camError.style.display = 'none';
  camError.textContent = '';
  camModal.classList.add('open');

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    camSwitch.classList.toggle('hidden', videoDevices.length < 2);
  } catch (_) {
    camSwitch.classList.add('hidden');
  }

  await startStream(facingMode);
}

async function startStream(facingMode) {
  stopStream();
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    camVideo.srcObject = camStream;
  } catch (err) {
    camError.textContent = err.name === 'NotAllowedError'
      ? t('camDenied')
      : `${t('camError')}: ${err.message}`;
    camError.style.display = 'block';
  }
}

function stopStream() {
  if (camStream) {
    camStream.getTracks().forEach(track => track.stop());
    camStream = null;
  }
  camVideo.srcObject = null;
}

function closeCamera() {
  stopStream();
  camModal.classList.remove('open');
}

camClose.addEventListener('click', closeCamera);
camModal.addEventListener('click', e => { if (e.target === camModal) closeCamera(); });
camSwitch.addEventListener('click', () => {
  camFacingMode = camFacingMode === 'user' ? 'environment' : 'user';
  startStream(camFacingMode);
});
camCapture.addEventListener('click', () => {
  if (!camStream) return;
  const w = camVideo.videoWidth;
  const h = camVideo.videoHeight;
  if (!w || !h) return;
  camCanvas.width = w;
  camCanvas.height = h;
  camCanvas.getContext('2d').drawImage(camVideo, 0, 0, w, h);
  camCanvas.toBlob(blob => {
    if (!blob) return;
    setFile(new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' }));
    closeCamera();
  }, 'image/jpeg', 0.92);
});

document.getElementById('cam-back-btn').addEventListener('click', () => openCamera('environment'));
document.getElementById('cam-front-btn').addEventListener('click', () => openCamera('user'));

// ── Status helpers ─────────────────────────────────────────────────────────
function showStatus(type, message) {
  statusEl.style.display = '';
  statusEl.className = type;
  statusText.textContent = message;
  spinner.style.display = type === 'loading' ? 'block' : 'none';
}
function hideStatus() {
  statusEl.className = '';
  statusEl.style.display = 'none';
  spinner.style.display = 'none';
}

// ── Scan ───────────────────────────────────────────────────────────────────
scanBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  scanBtn.disabled = true;
  downloadBtn.style.display = 'none';
  emailSection.classList.remove('visible');
  pdfBlob = null;
  showStatus('loading', t('statusLoading'));

  const form = new FormData();
  form.append('image', selectedFile);

  try {
    const res = await fetch('/scan', { method: 'POST', body: form });

    if (res.ok) {
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?([^";\n]+)"?/);
      if (match) pdfFilename = match[1];

      pdfBlob = await res.blob();
      showStatus('success', t('statusSuccess'));
      downloadBtn.style.display = 'flex';
      emailSection.classList.add('visible');
      setEmailStatus('', '');
    } else {
      const data = await res.json().catch(() => ({ error: t('statusServerErr') }));
      showStatus('error', data.error || t('statusUnknown'));
    }
  } catch {
    showStatus('error', t('statusNoServer'));
  } finally {
    scanBtn.disabled = false;
  }
});

// ── Crop ───────────────────────────────────────────────────────────────────
const cropModal   = document.getElementById('crop-modal');
const cropCanvas  = document.getElementById('crop-canvas');
const cropCtx     = cropCanvas.getContext('2d');
const cropClose   = document.getElementById('crop-close');
const cropConfirm = document.getElementById('crop-confirm');
const cropReset   = document.getElementById('crop-reset');

let cropImage   = null;
let cropScale   = 1;
let cropSel     = null;
let cropDragging = false;
let cropStart   = null;

function openCrop() {
  if (!selectedFile) return;
  const img = new Image();
  img.onload = () => {
    cropImage = img;
    const maxW = Math.min(680, window.innerWidth - 64);
    const maxH = Math.floor(window.innerHeight * 0.6);
    cropScale = Math.min(maxW / img.width, maxH / img.height, 1);
    cropCanvas.width  = Math.round(img.width  * cropScale);
    cropCanvas.height = Math.round(img.height * cropScale);
    cropSel = null;
    drawCrop();
    cropModal.classList.add('open');
  };
  img.src = URL.createObjectURL(selectedFile);
}

function drawCrop() {
  cropCtx.drawImage(cropImage, 0, 0, cropCanvas.width, cropCanvas.height);
  if (!cropSel || cropSel.w < 2 || cropSel.h < 2) return;
  const { x, y, w, h } = cropSel;
  cropCtx.fillStyle = 'rgba(0,0,0,0.55)';
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.drawImage(cropImage,
    x / cropScale, y / cropScale, w / cropScale, h / cropScale,
    x, y, w, h
  );
  cropCtx.strokeStyle = '#4f8ef7';
  cropCtx.lineWidth = 2;
  cropCtx.strokeRect(x, y, w, h);
  const hs = 8;
  cropCtx.fillStyle = '#4f8ef7';
  [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([cx,cy]) => {
    cropCtx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
  });
}

function cropPos(e) {
  const rect = cropCanvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  const sx   = cropCanvas.width  / rect.width;
  const sy   = cropCanvas.height / rect.height;
  return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

cropCanvas.addEventListener('mousedown',  e => { cropDragging = true; cropStart = cropPos(e); });
cropCanvas.addEventListener('mousemove',  e => { if (!cropDragging) return; updateSel(cropPos(e)); });
cropCanvas.addEventListener('mouseup',    () => finishDrag());
cropCanvas.addEventListener('mouseleave', () => finishDrag());
cropCanvas.addEventListener('touchstart', e => { e.preventDefault(); cropDragging = true; cropStart = cropPos(e); }, { passive: false });
cropCanvas.addEventListener('touchmove',  e => { e.preventDefault(); if (cropDragging) updateSel(cropPos(e)); }, { passive: false });
cropCanvas.addEventListener('touchend',   e => { e.preventDefault(); finishDrag(); }, { passive: false });

function updateSel(pos) {
  const x = clamp(Math.min(cropStart.x, pos.x), 0, cropCanvas.width);
  const y = clamp(Math.min(cropStart.y, pos.y), 0, cropCanvas.height);
  const w = clamp(Math.abs(pos.x - cropStart.x), 0, cropCanvas.width  - x);
  const h = clamp(Math.abs(pos.y - cropStart.y), 0, cropCanvas.height - y);
  cropSel = { x, y, w, h };
  drawCrop();
}

function finishDrag() {
  cropDragging = false;
  if (cropSel && (cropSel.w < 5 || cropSel.h < 5)) { cropSel = null; drawCrop(); }
}

cropClose.addEventListener('click', () => cropModal.classList.remove('open'));
cropModal.addEventListener('click', e => { if (e.target === cropModal) cropModal.classList.remove('open'); });
cropReset.addEventListener('click', () => { cropSel = null; drawCrop(); });

cropConfirm.addEventListener('click', () => {
  if (!cropSel || cropSel.w < 5 || cropSel.h < 5) { cropModal.classList.remove('open'); return; }
  const sx = cropSel.x / cropScale, sy = cropSel.y / cropScale;
  const sw = cropSel.w / cropScale, sh = cropSel.h / cropScale;
  const out = document.createElement('canvas');
  out.width = Math.round(sw); out.height = Math.round(sh);
  out.getContext('2d').drawImage(cropImage, sx, sy, sw, sh, 0, 0, sw, sh);
  out.toBlob(blob => {
    if (!blob) return;
    setFile(new File([blob], selectedFile.name, { type: 'image/jpeg' }));
    cropModal.classList.remove('open');
  }, 'image/jpeg', 0.95);
});

document.getElementById('crop-btn').addEventListener('click', openCrop);

// ── Email ───────────────────────────────────────────────────────────────────
const emailInput   = document.getElementById('email-input');
const emailSendBtn = document.getElementById('email-send-btn');
const emailStatus  = document.getElementById('email-status');

function setEmailStatus(type, msg) {
  emailStatus.className = type;
  emailStatus.textContent = msg;
}

emailSendBtn.addEventListener('click', async () => {
  const address = emailInput.value.trim();
  if (!address) { setEmailStatus('error', t('emailNoAddr')); return; }
  if (!pdfBlob)  { setEmailStatus('error', t('emailNoPdf')); return; }

  emailSendBtn.disabled = true;
  setEmailStatus('', '');

  const form = new FormData();
  form.append('email', address);
  form.append('pdf', pdfBlob, pdfFilename);

  try {
    const res = await fetch('/send-email', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEmailStatus('success', (data.message || t('emailSent')) + ' ' + t('emailSpam'));
      emailInput.value = '';
    } else {
      setEmailStatus('error', data.error || t('emailFail'));
    }
  } catch {
    setEmailStatus('error', t('emailNoServer'));
  } finally {
    emailSendBtn.disabled = false;
  }
});

// ── Download ───────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!pdfBlob) return;
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});
