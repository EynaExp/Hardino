"""SSH executor for running commands on remote systems.

SSH credentials are:
- Received per-scan via the API
- Passed directly to asyncssh
- NEVER stored in database or files
- Memory-wiped after scan completion
"""

import asyncssh
import asyncio
import re
from typing import Optional
from dataclasses import dataclass


@dataclass
class SSHCredentials:
    host: str
    port: int = 22
    username: str = ""
    password: Optional[str] = None
    key_path: Optional[str] = None
    os_type: str = "linux"


@dataclass
class CommandResult:
    command: str
    output: str
    exit_code: int
    success: bool
    error: Optional[str] = None


class SSHExecutor:
    def __init__(self, creds: SSHCredentials):
        self.creds = creds
        self._conn: Optional[asyncssh.SSHClientConnection] = None

    async def connect(self) -> bool:
        """Establish SSH connection."""
        try:
            connect_kwargs = {
                "host": self.creds.host,
                "port": self.creds.port,
                "username": self.creds.username,
                "known_hosts": None,
            }
            if self.creds.key_path:
                connect_kwargs["client_keys"] = [self.creds.key_path]
            elif self.creds.password:
                connect_kwargs["password"] = self.creds.password
            else:
                raise ValueError("Either password or key_path must be provided")

            self._conn = await asyncio.wait_for(
                asyncssh.connect(**connect_kwargs),
                timeout=15,
            )
            return True
        except Exception as e:
            return False

    async def run(self, command: str, timeout: int = 30) -> CommandResult:
        """Run a single command via SSH."""
        if not self._conn:
            return CommandResult(
                command=command, output="", exit_code=-1,
                success=False, error="Not connected",
            )
        try:
            result = await asyncio.wait_for(
                self._conn.run(command),
                timeout=timeout,
            )
            output = (result.stdout or "") + (result.stderr or "")
            return CommandResult(
                command=command,
                output=output.strip(),
                exit_code=result.exit_status or 0,
                success=(result.exit_status == 0),
            )
        except asyncio.TimeoutError:
            return CommandResult(
                command=command, output="", exit_code=-1,
                success=False, error="Command timed out",
            )
        except Exception as e:
            return CommandResult(
                command=command, output="", exit_code=-1,
                success=False, error=str(e),
            )

    async def detect_os(self) -> str:
        """Detect remote OS type."""
        # FortiOS: `uname` does not exist; probe the FortiGate CLI first
        result = await self.run("get system status", timeout=10)
        if any(x in result.output for x in ["FortiGate", "FortiOS", "FortiAnalyzer", "fortinet"]):
            return "fortigate"
        # ESXi: has esxcli, no uname match on Linux; probe before uname
        result = await self.run("esxcli system version get 2>/dev/null || echo NOT_ESXI")
        if "NOT_ESXI" not in result.output and any(
            x in result.output.lower() for x in ["esxi", "vmware", "version:"]
        ):
            return "esxi"
        result = await self.run("uname -a 2>/dev/null || echo NOT_LINUX")
        if "Linux" in result.output or "linux" in result.output:
            return "linux"
        result = await self.run("ver 2>nul || echo NOT_WINDOWS")
        if "Windows" in result.output or "Microsoft" in result.output:
            return "windows"
        return "linux"

    async def disconnect(self):
        """Close SSH connection and wipe credentials from memory."""
        if self._conn:
            try:
                self._conn.close()
                await self._conn.wait_closed()
            except Exception:
                pass
            self._conn = None
        # Wipe credential data from memory
        self.creds.password = None
        self.creds.key_path = None
        self.creds.username = ""
        self.creds.host = ""

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, *args):
        await self.disconnect()


def evaluate_check(output: str, expected_pattern: Optional[str]) -> bool:
    """Evaluate a check result against expected pattern.

    Returns True if the check passes (output matches expected).
    If expected_pattern is None, any non-empty output is considered a pass.
    """
    if not expected_pattern:
        return bool(output.strip())
    try:
        return bool(re.search(expected_pattern, output, re.IGNORECASE))
    except re.error:
        return expected_pattern.lower() in output.lower()
