#!/usr/bin/env bash
# Exit on error
set -o errexit

if [ -f "backend/build.sh" ]; then
    chmod +x backend/build.sh
    ./backend/build.sh
elif [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh
fi
