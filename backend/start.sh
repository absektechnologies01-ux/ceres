#!/bin/bash
# Start the Ceres backend API
# Run from the backend/ directory
venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
