FROM python:3.12-slim

WORKDIR /app

# Configure Debian package mirror (Tsinghua / Aliyun)
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list 2>/dev/null || true

# Install system libraries needed by xmlsec / python3-saml, build tools and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libxml2-dev \
    libxmlsec1-dev \
    libxmlsec1-openssl \
    gcc \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies with domestic PyPI mirror (Tsinghua)
COPY requirements.txt ./
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --upgrade pip && \
    pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# Copy application files
COPY . .

# Ensure upload directory and cert directories exist
RUN mkdir -p uploads certs/yggdrasil certs/dev cert && \
    chmod +x entrypoint.sh

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV ENVIRONMENT=production

ENTRYPOINT ["./entrypoint.sh"]
