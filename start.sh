#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo "Shutting down..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "=== Hardino ==="

# Kill existing
for port in 8001 3000; do
    pid=$(lsof -ti:$port 2>/dev/null || true)
    [ -n "$pid" ] && kill $pid 2>/dev/null && sleep 1
done

# Start backend
echo "[1/2] Starting backend on :8001..."
cd backend
[ -d ".venv" ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null
mkdir -p data
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "[2/2] Starting frontend on :3000..."
cd frontend
[ -d "node_modules" ] || npm install --silent
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

echo ""
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:8001"
echo "Login:     admin / admin123"
echo ""
echo "Press Ctrl+C to stop"
wait
