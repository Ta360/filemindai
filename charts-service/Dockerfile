FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5001
# gunicorn, not Flask's dev server — matplotlib chart generation is CPU-bound,
# so a couple of worker processes keep one slow render from blocking others.
CMD ["gunicorn", "-b", "0.0.0.0:5001", "-w", "2", "--timeout", "30", "app:app"]
