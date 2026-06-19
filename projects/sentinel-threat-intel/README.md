# Sentinel Threat Intel: Autonomous Local Security Daemon

This is the absolute architectural blueprint of the **Sentinel Threat Intel Daemon**. The system operates as an air-gapped, low-overhead background security agent designed to ingest local system logs and network connection telemetry, filter activities through a deterministic rules engine, classify threat vectors utilizing a local Large Language Model (Ollama Llama3), and dispatch real-time alerts to a security dashboard or notification channel.

This project is engineered to demonstrate applied system-level programming, concurrent event tracking, offline AI pipeline orchestration, and network security analysis. This system aligns directly with the competencies required for the **ICT Security Specialist (ANZSCO 262112)** and **Software Engineer (ANZSCO 261313)** tracks under the New Zealand Tier 1 Green List.

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

## Core Computational Layers

### Layer 1: System Telemetry Ingestion (Low-Level Collector)
The daemon binds to local operating system telemetry using cross-platform hooks:
*   **Network Socket Probe**: Continuous polling of active network connection states via the operating system's raw sockets (using `psutil.net_connections`). It tracks outbound TCP connections, established ports, and flags rapid port-binding activities indicating scanning behavior.
*   **System Event Log Hook**: Monitors authentication failure rates (such as Windows Event ID 4625 for failed logins or standard Unix syslog `/var/log/auth.log` records) to detect active brute-force vectors.

### Layer 2: Normalization & In-Memory Rules Aggregator
Raw OS connection logs and events are normalized into a unified, standard schema. An in-memory state engine tracks activities over a rolling time window:
*   **Aggregator Gates**: Prevents AI inference queue thrashing by gating alerts. For instance, multiple failed logins from the same source IP are aggregated over a 15-second window. Only when the count exceeds `3` attempts does the pipeline escalate the event.
*   **Threat Data Packetization**: Constructs a normalized context payload:
    ```json
    {
      "source_ip": "192.168.1.45",
      "destination_port": 22,
      "event_type": "FAILED_AUTHENTICATION_EXCEEDED",
      "event_count": 5,
      "time_window_seconds": 15,
      "target_system": "local_host"
    }
    ```

### Layer 3: Local AI Intelligence Layer (Offline Llama3)
Instead of relying on rigid, static regex rules to assess complex threat behaviors, the system uses a localized Large Language Model (Ollama Llama3) running completely offline on the host hardware:
*   **Context Isolation**: The payload is embedded into a strict system instruction context.
*   **System Prompting**:
    > "You are Sentinel-AI, an automated ICT Security Specialist running on an air-gapped system. You analyze JSON telemetry logs. Output a strict JSON response containing: 1. 'threat_level' (LOW, MEDIUM, HIGH, CRITICAL), 2. 'attack_vector' (a 2-word classification), and 3. 'mitigation_step' (a concise, 1-sentence technical instruction). Do not include conversational text or fluff."
*   **Inference Endpoint**: An asynchronous HTTP POST client executes the request to `http://localhost:11434/api/generate` and parses the response.

### Layer 4: Dispatcher Layer (Webhooks & Console)
Once the local LLM generates the threat report, the dispatcher formats a rich message containing:
*   Color-coded embeds matching the threat level (Red for `CRITICAL`, Orange for `HIGH`, Green for `LOW`).
*   The exact source IP, ports targeted, and local AI mitigation steps.
*   A REST payload sent to the configured Discord Webhook or logged to the secure local dashboard stream.

---

## Installation & Setup

### Prerequisites
*   Python 3.10+
*   Local Ollama installation with the `llama3` model pulled (`ollama pull llama3`)

### Installation Steps
1.  Clone the repository and navigate to the project directory:
    ```bash
    cd projects/sentinel-threat-intel
    ```
2.  Install dependencies:
    ```bash
    pip install psutil httpx
    ```
3.  Configure your credentials:
    Create a `config.json` inside the project root:
    ```json
    {
      "discord_webhook_url": "YOUR_DISCORD_WEBHOOK_URL_HERE",
      "ollama_api_url": "http://localhost:11434/api/generate",
      "poll_interval_seconds": 5.0,
      "failed_login_threshold": 3
    }
    ```
4.  Run the security daemon:
    ```bash
    python main.py
    ```
