"""
Web Receipt Scanner — Flask backend
Accepts an image upload, decodes the QR code, fetches the SUF API,
and returns the receipt PDF for direct download.
"""

import os
import re
import smtplib
from email.message import EmailMessage
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from io import BytesIO

from services.qr_service import extract_qr_url
from services.suf_service import fetch_receipt_data, parse_receipt_summary
from services.pdf_service import generate_receipt_pdf

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_MIME = {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'}


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/scan', methods=['POST'])
def scan():
    """
    POST /scan
    Multipart form with a single field 'image' containing the receipt image.
    Returns the PDF as an attachment, or a JSON error.
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided. Please upload an image of the receipt.'}), 400

    file = request.files['image']

    if file.mimetype not in ALLOWED_MIME:
        return jsonify({'error': f'Unsupported file type: {file.mimetype}. Please upload a JPEG, PNG, or WebP image.'}), 400

    image_bytes = file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        return jsonify({'error': 'Image is too large (max 20 MB).'}), 400

    # 1. Decode QR code
    try:
        verification_url = extract_qr_url(image_bytes)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    except Exception as e:
        app.logger.error('QR decode error: %s', e)
        return jsonify({'error': 'Failed to read the image. Please try a clearer photo.'}), 500

    # 2. Fetch receipt data from SUF API
    try:
        receipt_data = fetch_receipt_data(verification_url)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    except Exception as e:
        app.logger.error('SUF API error: %s', e)
        return jsonify({'error': 'Could not reach the Serbian fiscal service. Please try again.'}), 502

    # 3. Generate PDF
    summary = parse_receipt_summary(receipt_data)
    invoice_number = summary.get('invoice_number') or 'receipt'

    try:
        pdf_bytes = generate_receipt_pdf(receipt_data, invoice_number)
    except Exception as e:
        app.logger.error('PDF generation error: %s', e)
        return jsonify({'error': 'Failed to generate the PDF.'}), 500

    # Sanitise filename
    safe_name = re.sub(r'[^A-Za-z0-9_\-]', '_', invoice_number)
    filename = f'receipt_{safe_name}.pdf'

    return send_file(
        BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename,
    )


@app.route('/send-email', methods=['POST'])
def send_email():
    """
    POST /send-email
    Multipart form with 'email' (recipient) and 'pdf' (the receipt PDF file).
    """
    email_to = request.form.get('email', '').strip()
    if not email_to or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email_to):
        return jsonify({'error': 'Please provide a valid email address.'}), 400

    if 'pdf' not in request.files:
        return jsonify({'error': 'No PDF provided.'}), 400

    pdf_file = request.files['pdf']
    pdf_bytes = pdf_file.read()
    filename = pdf_file.filename or 'receipt.pdf'

    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_pass = os.environ.get('SMTP_PASS')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)

    if not all([smtp_host, smtp_user, smtp_pass]):
        app.logger.error('SMTP not configured')
        return jsonify({'error': 'Email sending is not configured on this server.'}), 503

    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your receipt'
        msg['From'] = smtp_from
        msg['To'] = email_to
        msg.set_content('Please find your receipt attached.')
        msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename=filename)

        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_user, smtp_pass)
            smtp.send_message(msg)
    except Exception as e:
        app.logger.error('Email send error: %s', e)
        return jsonify({'error': 'Failed to send the email. Please try again.'}), 500

    return jsonify({'message': f'Receipt sent to {email_to}.'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
