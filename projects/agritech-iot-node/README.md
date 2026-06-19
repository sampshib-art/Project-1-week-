# Agritech IoT Telemetry Node: Architectural Blueprint

This is the absolute architectural blueprint of the Agritech IoT Telemetry Node. We are breaking this down to the absolute fundamental layer—from the physical voltage fluctuations on the microcontroller to the asynchronous event loops in the cloud dashboard.

This system is engineered to showcase full-stack competency across low-level hardware interaction, real-time data ingestion, local AI orchestration, and production-grade frontend rendering. This architecture aligns directly with the capabilities required for Tier 1 Green List tracks like Software Engineer (ANZSCO 261313) and Developer Programmer (ANZSCO 261312) in New Zealand.

## The Master Architecture Overview

The system operates as a decoupled, uni-directional reactive data pipeline divided into four distinct computational layers:

```
[ Edge Hardware Layer ] (Raspberry Pi Pico / MicroPython)
          │
          ▼ (USB Serial / UART JSON Stream)
[ Ingestion Backend Layer ] (Python FastAPI + PySerial)
          │
          ├──► [ Intelligence Layer ] (Local Ollama LLM Inference)
          │
          ▼ (Server-Sent Events / WebSockets)
[ Visualization UI Layer ] (Next.js Brutalist Dashboard)
```

---

## Layer 1: The Edge Hardware Layer (MicroPython Firmware)

The foundation of the project resides entirely on the silicon of the RP2040 microcontroller.

### 1. Physical Hardware Analog-to-Digital Conversion (ADC)
*   The Raspberry Pi Pico contains an internal temperature sensor connected to ADC Channel 4.
*   The RP2040 microchip passes an analog voltage through this channel based on ambient kinetic thermal energy.
*   The 12-bit ADC converts this analog voltage into a digital integer ranging from $0$ to $4095$. MicroPython scales this to a 16-bit unsigned integer (u16) ranging from $0$ to $65535$.
*   The firmware samples this pin and computes the exact voltage using the following equation:
    $$V_{out} = \frac{\text{Reading}}{65535} \times 3.3$$
*   Using the RP2040 datasheet specifications, the voltage is translated into Celsius:
    $$\text{Temp}(^\circ\text{C}) = 27 - \frac{V_{out} - 0.706}{0.001721}$$

### 2. Math-Driven Environmental State Machine
To account for missing physical components, the firmware implements a deterministic mathematical model simulating real-world agricultural physics:
*   **Soil Moisture Decay**: Modeled using a random walk with a downward bias, simulating natural evaporation and soil drainage:
    $$\text{Moisture}_{t} = \text{Moisture}_{t-1} - \Delta M, \quad \text{where } \Delta M \sim U(0.1, 1.5)$$
*   **Automated Irrigation Loop**: A hardware-level threshold gate monitors this variable. The moment moisture drops below 15%, the script triggers an instantaneous state change to 85%, simulating an automated localized irrigation valve opening.
*   **Ambient Fluctuation**: Humidity is simulated using an unbiased Gaussian noise model to reflect atmospheric instability.

### 3. Serialization and Serialization Transport
Every 2000 milliseconds, the state variables are gathered into a key-value memory map (Dictionary) and passed to a JSON encoder. The encoder transforms the structure into a standardized string buffer.

The payload structure is designed to follow strict corporate schema standards. Payload is emitted via the universal hardware communication standard: Universal Asynchronous Receiver-Transmitter (UART) over the USB serial bridge.

---

## Layer 2: The Ingestion Backend Layer (FastAPI)

The backend acts as an asynchronous data ingestion node running on your host machine. It serves two tasks: polling the hardware connection and exposing a high-throughput API.

### 1. Asynchronous Serial Polling Loop
*   Using `pyserial-asyncio`, the Python backend opens a non-blocking connection to the virtual COM port allocated to the Raspberry Pi Pico (e.g., `/dev/ttyACM0` or `COM3`).
*   A background worker continuously checks the operating system's serial read buffer.
*   The script reads until it encounters a newline byte (`\n`), indicating the completion of a JSON payload packet.
*   The raw byte string is decoded into UTF-8 text and safely passed to a `json.loads()` parser. If parsing fails due to corrupted bits, an exception handling loop catches the error, drops the corrupted packet, and keeps the stream alive without crashing the server.

### 2. The Data Routing Core
Once parsed, the data takes two concurrent paths:
*   **UI Dispatch**: Placed directly into an asynchronous in-memory pub-sub queue (`asyncio.Queue`) to be streamed instantly to the frontend web browser.
*   **Anomalous Processing**: The telemetry variables are checked against safety limits. If an anomaly is flags (e.g., `soil_moisture_pct < 20%`), an execution worker calls the Intelligence Layer.

---

## Layer 3: The Intelligence Layer (Local LLM via Ollama)

Instead of relying on rigid, hard-coded rules, the system passes complex environmental states to a locally hosted Large Language Model (like Llama3 or Mistral via Ollama), proving advanced AI integration skills.

### 1. Context Isolation & System Prompting
When an environmental threshold is crossed, the backend constructs an isolation context. The system prompt forces the model to act as a strict Agritech Diagnostic Agent:
> "You are an automated Agritech Systems Diagnostic Core running on an isolated node. You receive real-time JSON environmental telemetry. You must analyze the inputs and generate a concise, 1-sentence diagnostic response detailing the risk factor and immediate corrective actions. Do not include conversational text or fluff."

### 2. Execution and Response Extraction
*   The backend sends a structured REST POST request to `http://localhost:11434/api/generate`.
*   The payload includes the system prompt and the raw telemetry data context.
*   The local model runs inference entirely on your system hardware, completely offline.
*   The generated response is parsed, given an urgency timestamp, and injected directly into the live dashboard broadcast stream.

---

## Layer 4: The Visualization UI Layer (Next.js Dashboard)

The frontend is a stark, high-performance, dark-mode Next.js dashboard built using an industrial, ultra-clean design aesthetic.

### 1. Real-Time Streaming Connection
*   Instead of killing the server with constant HTTP polling every second, the frontend establishes a single, long-lived connection using Server-Sent Events (SSE) via the native web `EventSource` API.
*   The FastAPI backend keeps the HTTP response channel open using a `StreamingResponse`.
*   As new data drops into the backend `asyncio.Queue`, it is pushed down the SSE pipe as an ongoing text stream.
*   The React frontend listens for this stream, capturing and parsing incoming packets instantly.

### 2. State Management & Visual Performance
*   **The Graph Engine**: A lightweight charting library processes incoming values, updating a scrolling live timeline graph of the temperature and moisture vectors.
*   **The Log Console**: A simulated system terminal window prints out raw JSON string data directly as it leaves the Pico.
*   **AI Alert Center**: When the backend pushes an AI diagnostic alert down the SSE pipe, the UI triggers a visible alert banner alongside the text output generated by the local LLM.
