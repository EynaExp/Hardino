# Hardino

**AI-powered device hardening assessment platform** — audit Linux servers, Windows Server, FortiGate firewalls and VMware ESXi hosts against vendor hardening benchmarks over SSH, track assets, and generate reports with optional AI analysis.

> ⚠️ **Authorized use only.** Hardino connects to targets using credentials *you* provide. Only scan systems you own or have explicit permission to test.

---

## Features

- **4 supported platforms, 156 checks**
  | Platform | Checks | Benchmark sources |
  |---|---|---|
  | Linux | 69 | Linux Server Hardening guide, dev-sec `ansible-collection-hardening` (os_hardening / ssh_hardening) |
  | Windows Server | 26 | CIS Windows Server 2022 Benchmark |
  | FortiGate (FortiOS) | 39 | FortiOS 6.4 Hardening Guide, FortiOS 7.0 Best Practices, NIST SP 800-53 Rev. 5, SANS Firewall Auditing Checklist |
  | VMware ESXi | 22 | VMware vSphere Security Configuration Guide 8.0 (control set used by the Windmil vSphere Hardening Scanner) |
- **Auto OS detection** — probes FortiOS / ESXi / Linux / Windows in order when you pick *Auto*.
- **Read-only audits** — every check runs a read-only command (`show`, `get`, `esxcli`, `sysctl -n`, config greps). Hardino reports findings; it does **not** change the target.
- **Findings table** with free-text search and sort-by-severity (critical → low).
- **Score** = `100 − 15·critical − 8·high − 3·medium − 1·low` (clamped to 0–100).
- **Asset inventory** — every scanned host is saved automatically: OS info, open ports, services, last score, findings count. Notes are editable per asset; assets can be re-tested.
- **Per-scan credentials** — SSH username/password or key is sent with the scan request, used only for that scan, and wiped from memory afterwards. Never written to the database or disk.
- **Optional AI analysis** — LLM-written remediation summary for the report. Toggle it off and you get a plain report with no LLM call. Configure any OpenAI-compatible endpoint (OpenAI, OpenRouter, Ollama, …).
- **English / فارسی** UI with full RTL layout, plus **dark / light** themes and a green-on-black default.
- **Report export** — per-engagement report with totals, score and findings.

## Architecture

```
Browser ──> React (Vite)  ──> FastAPI ──> asyncssh ──> target (Linux / Windows / FortiGate / ESXi)
              :3000 dev         :8001 dev
              :80 (nginx)  in Docker, proxying /api → uvicorn :8000
```

- **Frontend** — React 18 + TypeScript + TailwindCSS, i18n context (`en` / `fa`).
- **Backend** — FastAPI + SQLAlchemy (SQLite via aiosqlite), JWT auth, async SSH executor.
- **Storage** — a single SQLite file in `data/` (Docker volume `hardino-data`).

## Quick start (Docker — recommended)

```bash
git clone https://github.com/EynaExp/Hardino.git
cd Hardino/docker
docker compose up -d --build
```

Open **http://localhost** and log in with **`admin` / `admin123`** → change the password right away (see [INSTALL.md §6](INSTALL.md#6-first-login)).

The compose file maps host port `80` → container `80` and `8001` → API. If port 80 is taken, edit `docker/docker-compose.yml`:

```yaml
    ports:
      - "8080:80"
      - "8001:8000"
```

## Manual / development run

```bash
./start.sh
```

This creates a Python venv, installs backend deps (FastAPI on **:8001**), installs npm deps (Vite dev server on **:3000**) and prints both URLs. Requires Python 3.11+ and Node 20+.

To run the pieces yourself:

```bash
# backend
cd backend && python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001

# frontend (second terminal)
cd frontend && npm install && npm run dev
```

Full setup, configuration and troubleshooting: **[INSTALL.md](INSTALL.md)**.

## First scan

1. Log in → **New Scan**.
2. Enter the **target host** (and port if not 22).
3. Pick the OS — or leave **Auto-detect**.
4. Enter SSH credentials (used for this scan only).
5. Toggle **AI analysis** on/off.
6. **Run** → watch phases live → open the scan for the **Findings** table and **Report** tab.

### Per-OS prerequisites

| OS | What must be enabled |
|---|---|
| Linux | `sshd` running and reachable |
| Windows | **OpenSSH Server** optional feature installed and `sshd` started — Hardino has no WinRM fallback |
| FortiGate | SSH admin access on the management interface (`config system ssh`), admin credentials |
| ESXi | SSH started temporarily: vSphere Client → Host → Actions → Services → **Start SSH** (stop it again afterwards — `EX-SVC-02` flags SSH running as a finding, per VMware SCG) |

FortiGate and ESXi expose restricted CLIs rather than full shells, so their checklists use only vendor CLI commands (`show`/`get`/`diagnose`, `esxcli`/`vim-cmd`) — no shell pipelines.

## Configuration

Settings load from `backend/.env` (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | dev secret | **Change in production** — signs login tokens |
| `OPENAI_API_KEY` | *(empty)* | API key for AI analysis (any OpenAI-compatible endpoint) |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` | e.g. `https://api.openai.com/v1` or `http://host:11434/v1` (Ollama) |
| `OPENAI_MODEL` | `xiaomi/mimo-v2.5` | Model id |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/hardino.db` | Database |

AI settings can also be changed (and test-saved) from the **Settings** page in the UI. With no key configured, scans still run — only the AI summary is skipped.

## Project structure

```
Hardino/
├── backend/
│   ├── main.py                 # FastAPI app entry
│   └── app/
│       ├── api/routes.py       # REST endpoints (auth, engagements, assets, settings)
│       ├── core/checklists.py  # 69 Linux + 26 Windows + 39 FortiGate + 22 ESXi checks
│       ├── core/orchestrator.py# scan phases, scoring, asset save, report
│       ├── core/ssh_executor.py# asyncssh wrapper, OS detection, credential wipe
│       └── models.py           # SQLAlchemy models (users, engagements, findings, assets…)
├── frontend/
│   └── src/
│       ├── pages/              # Dashboard, NewScan, ScanDetail, Assets, Settings…
│       ├── i18n/index.tsx      # en/fa language + theme provider
│       └── App.tsx             # routes + sidebar
├── docker/
│   ├── Dockerfile.app          # multi-stage: python + node + nginx
│   ├── docker-compose.yml
│   └── nginx.conf              # serves SPA, proxies /api → uvicorn
├── Documents/                  # source benchmark documents
├── start.sh                    # one-shot dev launcher (backend :8001 + frontend :3000)
└── INSTALL.md                  # full installation guide
```

## Security model

- SSH credentials are accepted per-scan, held only in process memory for the duration of the scan, and wiped (`password`, `key_path`, `username`, `host` nulled on disconnect). They are never persisted.
- All checks are read-only; Hardino never applies fixes to a target.
- JWT auth (8-hour tokens); default `admin/admin123` must be changed on first login (API: `PUT /api/auth/password`).
- Keep the deployed instance on a trusted network — it is an SSH client with credentials in flight.

## License

See repository owner for licensing terms. Benchmark names and references belong to their respective owners (CIS, Fortinet, Broadcom/VMware, NIST, SANS, dev-sec).
