"""
Decode QR codes from an uploaded image.
Uses pyzbar + Pillow.
"""

from PIL import Image
from pyzbar.pyzbar import decode as pyzbar_decode
import io


def extract_qr_url(image_bytes: bytes) -> str:
    """
    Decode the first QR code found in the image and return its string value.

    Raises:
        ValueError: if no QR code is found or the content is not a SUF URL.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    codes = pyzbar_decode(img)
    if not codes:
        # Try again with a sharpened / upscaled image
        img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
        codes = pyzbar_decode(img)

    if not codes:
        raise ValueError('No QR code detected in the image. Please make sure the QR code is clearly visible.')

    for code in codes:
        data = code.data.decode('utf-8', errors='replace')
        if 'suf.purs.gov.rs' in data:
            return data

    # Return the first one and let the SUF service validate it
    return codes[0].data.decode('utf-8', errors='replace')
