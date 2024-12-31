FROM mcr.microsoft.com/playwright/python:v1.49.1-noble

RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository universe && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer-gl1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    libgstreamer-plugins-good1.0-0 \
    gstreamer1.0-libav \
    libxslt1.1 \
    libwoff1 \
    libvpx9 \
    libevent-2.1-7 \
    libopus0 \
    libflite1 \
    libwebpdemux2 \
    libavif-dev \
    libharfbuzz-icu0 \
    libwebpmux3 \
    libenchant-2-2 \
    libsecret-1-0 \
    libhyphen0 \
    libmanette-0.2-0 \
    libgles2 \
    libx264-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm install

# Install Playwright for Node.js
RUN npx playwright install

# Copy the src folder and other necessary files
COPY ./src /app/src

# Set the working directory to src if you want to run the JavaScript file from there
WORKDIR /app/src

# Command to run your Node.js application (replace main.js with your entry file)
CMD ["node", "index.ts"]