#!/bin/bash

# Fix symbolic links in Mac app bundle for code signing
APP_PATH="$1"

if [ -z "$APP_PATH" ]; then
    echo "Usage: $0 <path-to-app>"
    exit 1
fi

echo "Fixing symbolic links in $APP_PATH"

# Find all symbolic links in the Python venv
PYTHON_VENV_PATH="$APP_PATH/Contents/Resources/python_core/venv"

if [ -d "$PYTHON_VENV_PATH" ]; then
    echo "Processing Python venv at $PYTHON_VENV_PATH"
    
    # Find and fix symbolic links in bin directory
    find "$PYTHON_VENV_PATH/bin" -type l | while read -r symlink; do
        if [ -L "$symlink" ]; then
            target=$(readlink "$symlink")
            echo "Replacing symlink $symlink -> $target"
            rm "$symlink"
            # Create a wrapper script that calls system python
            if [[ "$symlink" == *python* ]]; then
                echo '#!/usr/bin/env python3' > "$symlink"
                echo 'import sys; import subprocess; subprocess.run(["/usr/bin/python3"] + sys.argv[1:])' >> "$symlink"
                chmod +x "$symlink"
            fi
        fi
    done
fi

echo "Symbolic link fixing completed"
