# Hardino — Installation Guide

Two ways to run Hardino:

1. **Docker (recommended)** — one container, production-style, behind nginx.
2. **Manual / development** — backend + frontend dev servers on your host.

---

## 1. Requirements

| Method | Needed |
|---|---|
| Docker | Docker Engine 24+ with Compose v2 (`docker compose version`) |
| Manual | Python 3.11+, Node.js 20+, pip, a POSIX shell |

Also needed on **targets** (not on the Hardino host): SSH reachable as described in the README's per-OS prerequisites.

## 2. Get the code

```bash
git clone https://github.com/EynaExp/Hardino.git
cd Hardino
```

## 3. Install with Docker (recommended)

```bash
cd docker
docker compose up -d --build
```

This builds a multi-stage image (Python backend deps → `npm run build` → nginx + uvicorn) and starts a container that:

- serves the built frontend on **http://localhost** (port 80),
- proxies `/api/*` to the FastAPI app on port 8000 inside the container,
- persists the SQLite database in the Docker volume **`hardino-data`**.

Check it:

```bash
docker compose ps                      # should be "Up"
curl -I http://localhost/              # 200 — frontend served by nginx
curl http://localhost:8001/health       # {"status":"healthy"} — API (compose maps 8001→8000)
docker compose logs -f hardino          # uvicorn + nginx logs
```

> The `/health` endpoint lives on the API root. Nginx only proxies `/api/*`, so reach it via the mapped API port (8001), not through `http://localhost/`.

> **No compose?** Build and run directly:
> ```bash
> docker build -f docker/Dockerfile.app -t hardino-app .
> docker run -d --name hardino -p 8080:80 -p 8001:8000 hardino-app
> ```
> (frontend on http://localhost:8080, API on http://localhost:8001)

### Port conflicts

The default compose mapping is `80:80` and `8001:8000`. If port 80 is occupied (another web app, NetActor, …), edit `docker/docker-compose.yml`:

```yaml
    ports:
      - "8080:80"
      - "8001:8000"
```

Then `docker compose up -d` again.

### Persisting data across rebuilds

Data lives in the named volume `hardino-data`, so `docker compose down` (without `-v`) and image rebuilds keep your database. To wipe everything: `docker compose down -v`.

## 4. Install manually (development)

### 4.1 One-shot launcher

```bash
./start.sh
```

Creates `backend/.venv`, installs Python deps, starts uvicorn on **:8001**, installs npm deps and starts Vite on **:3000**. Ctrl+C stops both.

### 4.2 Or run the two halves yourself

**Backend:**

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdir -p data
uvicorn main:app --host 0.0.0.0 --port 8001
```

**Frontend** (new terminal):

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0    # http://localhost:3000
```

Production build of the frontend: `npm run build` (output in `frontend/dist`, serve it with any static server and proxy `/api` to the backend).

Verify:

```bash
curl http://localhost:8001/health     # {"status":"healthy"}
```

## 5. Configuration

Create `backend/.env` (picked up automatically by pydantic-settings):

```dotenv
# REQUIRED IN PRODUCTION — signs login tokens
JWT_SECRET=change-me-to-a-long-random-string

# Optional: AI analysis (any OpenAI-compatible endpoint)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://openapi.com/v1
OPENAI_MODEL=gpt-4o-mini

# Optional: database location (default: SQLite in ./data/hardino.db)
# DATABASE_URL=sqlite+aiosqlite:///./data/hardino.db
```

Notes:

- **Docker:** add the same variables under `environment:` in `docker-compose.yml`, or mount a `.env` file.
- **AI is optional.** Without a key, scans run normally and only the AI summary section is skipped. You can also configure/test the LLM from the **Settings** page in the UI at runtime.
- **JWT secret:** the built-in default is for development only — set your own before exposing the instance.

## 6. First login

1. Open the app (Docker: **http://localhost**, dev: **http://localhost:3000**).
2. Log in with **`admin` / `admin123`**.
3. Change the password immediately — there is no UI form for it yet; use the API:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"admin123"}' | jq -r .access_token)
   curl -X PUT http://localhost/api/auth/password \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"old_password":"admin123","new_password":"your-new-strong-password"}'
   ```
4. Set `JWT_SECRET` (section 5) if you haven't yet — existing sessions stay valid, new ones use the new secret.

## 7. Run your first scan

1. **New Scan** → name + target host (SSH port 22 unless stated).
2. Choose OS: Auto / Linux / Windows / FortiGate (FortiOS) / VMware ESXi.
3. Enter SSH credentials — they are used only for this scan and wiped afterwards, never stored.
4. Toggle **AI analysis** as desired.
5. **Run** → phases stream in live → open the scan for the findings table (search + sort by severity) and the Report tab.
6. The target is saved automatically under **Assets** — edit notes, re-test later.

### Target preparation checklist

- **Linux** — nothing to do if `sshd` is up.
- **Windows** — install OpenSSH Server and start it:
  ```powershell
  Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
  Start-Service sshd
  Set-Service -Name sshd -StartupType Automatic
  ```
- **FortiGate** — SSH to the management interface (default `admin@192.168.1.99`, port 22); ensure admin SSH access is enabled.
- **ESXi** — enable SSH temporarily: vSphere Client → Host → **Actions → Services → Start SSH**. Stop it when the scan finishes (the checklist flags running SSH as a finding).

## 8. Updating

```bash
cd Hardino
git pull

# Docker
cd docker && docker compose up -d --build

# Manual — just restart ./start.sh (it re-installs deps)
```

## 9. Uninstall

```bash
cd docker
docker compose down -v      # removes container AND the data volume
cd .. && rm -rf Hardino
```

Manual install: stop the processes, delete the repo folder (the database is `backend/data/hardino.db`).

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `port is already allocated` (80/8001) | Edit `docker-compose.yml` host ports (section 3) — e.g. `8080:80` |
| Container won't stay up / keeps restarting | `docker compose logs hardino` — usually a bad `.env` or port clash |
| `Failed to connect to target` | Target unreachable, wrong SSH port, or credentials rejected — verify manually: `ssh user@host -p 22` |
| Windows: connection refused | OpenSSH Server not installed/started (section 7) |
| ESXi: connection refused | Start SSH on the host (section 7) |
| FortiGate: auth fails | Use a full-admin account; check `config system ssh` is enabled on the interface you connect to |
| Blank page (dev) | Ensure the Vite server is running on :3000 and `npm install` completed; check the browser console |
| Backend import errors (dev) | Re-create the venv: `rm -rf backend/.venv && ./start.sh` |
| AI summary missing | Not an error — check `OPENAI_API_KEY`/`OPENAI_BASE_URL` in **Settings**; without a key the report is generated without the AI section |
| Scan says "No checklist available for OS" | Pick the OS explicitly instead of Auto-detect |

## 11. Security notes for operators

- Treat the Hardino host as **privileged**: it holds SSH credentials in memory during scans.
- Bind the service to a trusted network/VPN; do not expose port 80 to the internet without auth hardening in front of it.
- Change `admin/admin123` and `JWT_SECRET` before any shared use.
- Only scan assets you are authorized to assess.
