FROM python:3.12-slim

# System deps: zbar (for pyzbar QR decoding) + DejaVu fonts for PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "-m", "gunicorn", "app:app", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "60"]
