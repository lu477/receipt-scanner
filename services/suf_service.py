"""
SUF (Sistem za Upravljanje Fakturama) API client.

Fetches the full receipt JSON from the Serbian government fiscal service
by sending a GET request to the QR code URL with Accept: application/json.
"""

import httpx

SUF_TIMEOUT = 15  # seconds


def fetch_receipt_data(verification_url: str) -> dict:
    """
    Fetch receipt data from the SUF verification URL.

    Args:
        verification_url: URL decoded from the fiscal receipt QR code,
                          e.g. "https://suf.purs.gov.rs/v/?vl=..."

    Returns:
        dict with the receipt JSON payload.

    Raises:
        ValueError: if the URL does not look like a valid SUF URL.
        httpx.HTTPError: on network/HTTP errors.
    """
    if 'suf.purs.gov.rs' not in verification_url:
        raise ValueError('Not a valid SUF verification URL. Only Serbian fiscal receipts are supported.')

    with httpx.Client(timeout=SUF_TIMEOUT, follow_redirects=True) as client:
        response = client.get(
            verification_url,
            headers={'Accept': 'application/json'},
        )
        response.raise_for_status()
        return response.json()


def parse_receipt_summary(data: dict) -> dict:
    result = data.get('invoiceResult', {})
    request = data.get('invoiceRequest', {})
    return {
        'taxpayer_tin': request.get('taxId', ''),
        'invoice_number': result.get('invoiceNumber', ''),
        'total_amount': result.get('totalAmount', None),
        'sdc_datetime': result.get('sdcTime', None),
    }
