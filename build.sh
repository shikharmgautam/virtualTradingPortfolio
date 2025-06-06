#!/bin/bash
set -e

echo "Installing Python packages..."
pip3 install --no-cache-dir -r requirements.txt
echo "Installing Node packages..."
npm install
