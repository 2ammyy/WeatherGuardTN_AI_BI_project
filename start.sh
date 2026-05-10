#!/usr/bin/env bash
cd backend && exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8001}"
