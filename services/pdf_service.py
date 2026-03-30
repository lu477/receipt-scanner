"""
Generates a PDF for a Serbian fiscal receipt from the SUF JSON payload.
Uses ReportLab.
"""

from io import BytesIO
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Register DejaVu fonts for full Unicode / Cyrillic support
_FONT_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu',
    '/usr/share/fonts/dejavu',
    '/usr/share/fonts/TTF',
]
_FONT_DIR = next((d for d in _FONT_CANDIDATES if os.path.isdir(d)), None)

if _FONT_DIR:
    try:
        pdfmetrics.registerFont(TTFont('DejaVu', f'{_FONT_DIR}/DejaVuSans.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVu-Bold', f'{_FONT_DIR}/DejaVuSans-Bold.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVu-Mono', f'{_FONT_DIR}/DejaVuSansMono.ttf'))
        _FONTS_LOADED = True
    except Exception:
        _FONTS_LOADED = False
else:
    _FONTS_LOADED = False

_BODY_FONT = 'DejaVu' if _FONTS_LOADED else 'Helvetica'
_BOLD_FONT = 'DejaVu-Bold' if _FONTS_LOADED else 'Helvetica-Bold'
_MONO_FONT = 'DejaVu-Mono' if _FONTS_LOADED else 'Courier'

_TRANSACTION_TYPES = {0: 'Sale', 1: 'Refund'}
_INVOICE_TYPES = {
    0: 'Normal', 1: 'Proforma', 2: 'Training', 3: 'Advance', 4: 'Copy'
}
_PAYMENT_TYPES = {
    0: 'Cash', 1: 'Instant Payment', 2: 'Card',
    3: 'Check', 4: 'Wire Transfer', 5: 'Voucher', 6: 'Mobile',
}


def _fmt_amount(val) -> str:
    if val is None:
        return '—'
    try:
        return f'{float(val):,.2f} RSD'
    except (TypeError, ValueError):
        return str(val)


def _fmt_datetime(val) -> str:
    if not val:
        return '—'
    try:
        dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
        return dt.astimezone(timezone.utc).strftime('%d.%m.%Y %H:%M:%S')
    except Exception:
        return str(val)


def generate_receipt_pdf(receipt_data: dict, invoice_number: str) -> bytes:
    result = receipt_data.get('invoiceResult', {})
    req = receipt_data.get('invoiceRequest', {})
    journal = receipt_data.get('journal', '')

    payments = req.get('payments') or []
    payment_type_code = payments[0].get('paymentType') if payments else None
    payment_label = _PAYMENT_TYPES.get(
        payment_type_code,
        str(payment_type_code) if payment_type_code is not None else '—'
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title', parent=styles['Heading1'],
        fontName=_BOLD_FONT,
        alignment=TA_CENTER, fontSize=16, spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'Subtitle', parent=styles['Normal'],
        fontName=_BODY_FONT,
        alignment=TA_CENTER, fontSize=10,
        textColor=colors.HexColor('#555555'), spaceAfter=12,
    )
    mono_style = ParagraphStyle(
        'Mono', parent=styles['Normal'],
        fontName=_MONO_FONT, fontSize=8,
        leading=11, spaceAfter=0,
    )

    story = []

    story.append(Paragraph('Fiscal Receipt', title_style))
    story.append(Paragraph(invoice_number, subtitle_style))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#CCCCCC')))
    story.append(Spacer(1, 6 * mm))

    def row(label, value):
        return [label, str(value) if value is not None else '—']

    meta_rows = [
        row('Taxpayer TIN', req.get('taxId', '—')),
        row('Business Name', req.get('businessName', '—')),
        row('Location', req.get('locationName', '—')),
        row('Address', f"{req.get('address', '').strip()}, {req.get('city', '').strip()}"),
        row('Invoice Number', result.get('invoiceNumber', '—')),
        row('SDC Time', _fmt_datetime(result.get('sdcTime'))),
        row('Transaction Type', _TRANSACTION_TYPES.get(req.get('transactionType'), '—')),
        row('Invoice Type', _INVOICE_TYPES.get(req.get('invoiceType'), '—')),
        row('Payment Method', payment_label),
        row('Total Amount', _fmt_amount(result.get('totalAmount'))),
    ]

    meta_table = Table(meta_rows, colWidths=[55 * mm, 105 * mm])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), _BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), _BOLD_FONT),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#F7F7F7')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8 * mm))

    if journal:
        story.append(Paragraph('Receipt Tape', styles['Heading3']))
        story.append(Spacer(1, 2 * mm))
        for line in journal.splitlines():
            story.append(Paragraph(line if line.strip() else '&nbsp;', mono_style))
        story.append(Spacer(1, 8 * mm))

    now = datetime.now().strftime('%Y-%m-%d %H:%M')
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#CCCCCC')))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        f'Generated by Serbian Receipt Scanner · {now}',
        ParagraphStyle(
            'Footer', parent=styles['Normal'],
            fontName=_BODY_FONT,
            fontSize=8, textColor=colors.grey, alignment=TA_CENTER,
        ),
    ))

    doc.build(story)
    return buffer.getvalue()
