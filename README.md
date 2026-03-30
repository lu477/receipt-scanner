# Web Receipt Scanner

A simple website to scan Serbian fiscal receipt QR codes from a photo and download the PDF — no app, no login, no Google Drive.

## Features
- Upload an image (file picker or drag & drop)
- Use your phone's back camera, front camera, or a USB webcam
- QR code is decoded server-side (works even on desktop)
- Receipt data is fetched from the Serbian SUF government API
- PDF is generated and downloaded directly in the browser
- Donation progress bar at the bottom

## Running locally

### Option A — Docker (recommended)

```bash
cd web-receipt-scanner
docker compose up --build
```

Open http://localhost:5000

### Option B — Python virtualenv

```bash
cd web-receipt-scanner

# Install system dependency for QR decoding (Ubuntu/Debian)
sudo apt install libzbar0 fonts-dejavu-core

# On Arch Linux:
# sudo pacman -S zbar ttf-dejavu

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn   # or just use Flask dev server:

# Dev server:
FLASK_DEBUG=1 python app.py

# Production:
gunicorn app:app --bind 0.0.0.0:5000
```

## Customising the donation bar

In `static/index.html`, find this block near the bottom of the `<script>` tag:

```js
const DONATION_GOAL   = 50;    // € — your fundraising goal
const DONATION_RAISED = 12.5;  // € — amount raised so far
```

Update those two numbers to reflect your real totals.
To connect it to a live payment provider (Ko-fi, PayPal, etc.) you would replace
the static values with a small API call to that provider.

Also update the donation link:

```html
<a href="https://ko-fi.com" ...>Support this tool</a>
```

Replace `https://ko-fi.com` with your own Ko-fi / PayPal / Buy Me a Coffee link.

## Project structure

```
web-receipt-scanner/
├── app.py               # Flask app (one file)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── services/
│   ├── qr_service.py    # Decode QR code from uploaded image (pyzbar)
│   ├── suf_service.py   # Fetch receipt JSON from Serbian SUF API
│   └── pdf_service.py   # Generate PDF with ReportLab
└── static/
    └── index.html       # Single-page frontend (no build step needed)
```

## Notes

- Only Serbian fiscal receipts (suf.purs.gov.rs URLs) are supported.
- The image is never stored — it is processed in memory and discarded.
- Max upload size: 20 MB.
