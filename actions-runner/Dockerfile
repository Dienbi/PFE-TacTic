FROM myoung34/github-runner:ubuntu-jammy

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        apt-transport-https \
        ca-certificates \
        curl \
        git \
        gnupg \
        iproute2 \
        jq \
        lsb-release \
        postgresql-client \
        software-properties-common \
        unzip \
        zip \
        zstd \
    && add-apt-repository -y ppa:ondrej/php \
    && add-apt-repository -y ppa:deadsnakes/ppa \
    && curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh \
    && bash /tmp/nodesource_setup.sh \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        nodejs \
        php8.2-bcmath \
        php8.2-cli \
        php8.2-curl \
        php8.2-intl \
        php8.2-mbstring \
        php8.2-pgsql \
        php8.2-xml \
        php8.2-zip \
        python3.9 \
        python3.9-dev \
        python3.9-distutils \
        python3.9-venv \
    && curl -fsSL https://bootstrap.pypa.io/pip/3.9/get-pip.py -o /tmp/get-pip.py \
    && python3.9 /tmp/get-pip.py \
    && curl -fsSL https://getcomposer.org/installer -o /tmp/composer-setup.php \
    && php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer \
    && curl -fsSL "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.9 90 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 90 \
    && rm -rf /var/lib/apt/lists/* /tmp/nodesource_setup.sh /tmp/get-pip.py /tmp/composer-setup.php

RUN php -v \
    && composer --version \
    && node --version \
    && npm --version \
    && python --version \
    && pip --version \
    && pg_isready --version \
    && kubectl version --client=true
