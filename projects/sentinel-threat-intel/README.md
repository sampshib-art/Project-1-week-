# Sentinel Threat Intel: Autonomous Local Security Daemon

This is the absolute architectural blueprint of the **Sentinel Threat Intel Daemon**. The system operates as an air-gapped, low-overhead background security agent designed to ingest local system logs and network connection telemetry, filter activities through a deterministic rules engine, classify threat vectors utilizing a local Large Language Model (Ollama Llama3), and dispatch real-time alerts to a security dashboard or notification channel.

This project was built out of a genuine interest in systems security and local AI integration. It proves how lightweight background daemons can monitor system calls, detect anomalies, and utilize offline AI engines for real-time risk assessment without relying on cloud services.

---

## System Architecture

The Sentinel Daemon is structured as a decoupled, event-driven unidirectional data pipeline:

```
 [ Sockets & Sinks ] (psutil Net Sockets / Local Auth Logs)
          │
          ▼ (Real-Time Raw Ingestion Stream)
 [ Normalization Core ] (Log Schema Parsing & Timestamp Alignments)
          │
          ▼ (In-Memory Aggregator: Frequency/Port Threshold Check)
 [ AI Orchestrator ] (Local Ollama Llama3 POST Pipeline)
          │
          ▼ (Structured JSON Threat Payload)
 [ Notification Gateway ] (Discord Webhook / Local Console UI)
```

---

## Real-World Utility (How It's Useful IRL)

In a production environment, this daemon serves as a **Host-Based Intrusion Detection and Prevention System (HIDS/HIPS)**. 

Unlike traditional static security scanners (which can only trigger alerts based on rigid, pre-defined rules), Sentinel leverages a local Large Language Model to:
1.  **Understand Intent**: Distinguish between an administrator who forgot their password (low threat) and a coordinated automated script doing brute-force password spraying (high threat).
2.  **Generate Tailored Mitigation Steps**: The AI dynamically assesses what service is under attack (e.g. database port vs. web application port) and recommends the exact technical command to isolate the system.
3.  **Perform Automated Firewall Containment**: The dispatcher can be configured to run local shell commands (like `ufw block from <ip>` on Linux or Windows Advanced Firewall commands) to dynamically quarantine attackers in under 3 seconds.

---

## Operational Scenarios & Anomalies

The daemon checks for multiple security vectors:
*   **Brute-Force Detection**: Counts sequential authentication failures. If an IP exceeds `3` failures within `15` seconds, the Rules Engine flags it as a `BRUTE_FORCE_ATTACK_SUSPECTED`.
*   **Unmapped Socket Detection**: Monitors active TCP/UDP connections. If an outbound connection is established on a high-risk administrative port (such as `22` for SSH, `3389` for RDP, or databases like `3306` for MySQL) from an untrusted subnet, it triggers an instant anomaly report.

---

## Production Deployment & Integration (Real Hardware & OS)

### 1. Connecting to Real Operating System Logs
In the default testing setup, the script runs a mock log generator to make it easy to test. In a production Linux deployment:
*   **Tail the Syslog**: Replace the simulated log loop in [main.py](file:///D:/Project%201%20week/projects/sentinel-threat-intel/main.py) with an active log tailer using Python's `subprocess` or `select` module on `/var/log/auth.log` (Debian/Ubuntu) or `/var/log/secure` (RedHat/CentOS).
    ```python
    # Example production log watcher snippet
    def tail_auth_log():
        with open("/var/log/auth.log", "r") as f:
            f.seek(0, 2)  # Go to end of file
            while True:
                line = f.readline()
                if "Failed password" in line:
                    # Parse attacker IP and add to cache
                    process_failed_attempt(line)
  ```

### 2. Enabling Automated Active Response (Firewall Block)
To upgrade the system from an *Intrusion Detection System (IDS)* to an *Intrusion Prevention System (IPS)*, you can uncomment or add a command dispatcher that dynamically blocks the IP address:
```python
# Real-world dynamic firewall block dispatching
import subprocess

def quarantine_attacker_ip(attacker_ip: str):
    logger.warning(f"Isolating host: {attacker_ip} via local UFW firewall rules.")
    # Execute OS level firewall rule
    subprocess.run(["sudo", "ufw", "insert", "1", "deny", "from", attacker_ip], check=True)
```

### 3. Deploying as a 24/7 System Service (systemd)
To ensure the daemon runs continuously in the background on your server:
1.  Create a service configuration file at `/etc/systemd/system/sentinel-security.service`:
    ```ini
    [Unit]
    Description=Sentinel Threat Intel Local Security Daemon
    After=network.target

    [Service]
    Type=simple
    User=root
    WorkingDirectory=/opt/sentinel-threat-intel
    ExecStart=/usr/bin/python3 /opt/sentinel-threat-intel/main.py
    Restart=on-failure
    RestartSec=5

    [Install]
    WantedBy=multi-user.target
    ```
2.  Enable and start the service:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable sentinel-security.service
    sudo systemctl start sentinel-security.service
    ```

---

## Local Configuration (`config.json`)

Configure your logging preferences and integration links:
```json
{
  "discord_webhook_url": "YOUR_DISCORD_WEBHOOK_URL_HERE",
  "ollama_api_url": "http://localhost:11434/api/generate",
  "poll_interval_seconds": 5.0,
  "failed_login_threshold": 3
}
```
*(Leave `discord_webhook_url` empty to log alerts locally to the console).*
