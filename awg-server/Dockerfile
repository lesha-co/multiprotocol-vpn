FROM metaligh/amneziawg

# Download and install nvm:
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# in lieu of restarting the shell
# This sources the nvm script to make the nvm command available in the current shell session
# The backslash escapes the dot command to ensure it works properly in the Docker RUN context
RUN \. "$HOME/.nvm/nvm.sh"
# Download and install Node.js:
RUN nvm install 24

# Copy package.json first for better Docker layer caching
COPY package.json ./

# Install Node.js dependencies
RUN npm install
# Copy application files
COPY . .

RUN rm awgstart awguser readme serverip.cfg vpn_params.cfg


# Run as root (required for WireGuard operations)
USER root

# Default command
CMD ["./run.sh"]
