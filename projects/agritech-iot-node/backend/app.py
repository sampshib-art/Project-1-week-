import asyncio
import json
import logging
import random
import time
from typing import Set
import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("agritech-backend")

from contextlib import asynccontextmanager

# Define lifespan event handler for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch the serial telemetry reader background task
    task = asyncio.create_task(serial_polling_loop())
    yield
    # Shutdown: Cancel background tasks
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Agritech IoT Telemetry Ingestion Node", 
    version="1.0.0",
    lifespan=lifespan
)

# Restrict CORS to trusted local portfolio origins to block malicious browser scripts
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Active client queues for Server-Sent Events (SSE)
sse_clients: Set[asyncio.Queue] = set()

# Global state to prevent redundant LLM generation loops
last_alert_time = 0.0
ALERT_COOLDOWN = 15.0  # seconds

# Ingress target details
SERIAL_PORT = "COM3"  # Adjust for target host (e.g. "/dev/ttyACM0" on Unix)
BAUD_RATE = 115200
OLLAMA_URL = "http://localhost:11434/api/generate"

async def generate_ai_diagnostic(telemetry: dict) -> str:
    """Invokes local Ollama LLM to analyze anomalous conditions and generate a diagnostic response."""
    system_prompt = (
        "You are an automated Agritech Systems Diagnostic Core running on an isolated node. "
        "You receive real-time JSON environmental telemetry. You must analyze the inputs and "
        "generate a concise, 1-sentence diagnostic response detailing the risk factor and "
        "immediate corrective actions. Do not include conversational text or fluff."
    )
    
    payload = {
        "model": "llama3",  # Falls back to standard model configurations
        "prompt": f"System Prompt: {system_prompt}\nTelemetry: {json.dumps(telemetry)}",
        "stream": False
    }
    
    logger.info("[Intelligence Layer] Telemetry anomaly detected. Triggering local Ollama diagnostics...")
    
    try:
        async with httpx.AsyncClient() as client:
            # 5-second timeout for local low-latency requirements
            response = await client.post(OLLAMA_URL, json=payload, timeout=5.0)
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "AI_DIAGNOSTIC: Soil moisture critical. Check irrigation lines.").strip()
            else:
                return f"AI_DIAGNOSTIC: API error code {response.status_code}. Telemetry anomaly."
    except Exception as e:
        logger.error(f"[Intelligence Layer] Ollama connection failed: {e}")
        return "AI_DIAGNOSTIC: Local LLM offline. Action: Check irrigation valves immediately."

def validate_telemetry(packet: dict) -> bool:
    """Validates the input schema and numeric boundaries of telemetry packets to prevent input injection attacks."""
    required_keys = {"temperature_c", "soil_moisture_pct", "humidity_pct"}
    if not required_keys.issubset(packet.keys()):
        return False
    try:
        temp = float(packet["temperature_c"])
        moisture = float(packet["soil_moisture_pct"])
        humidity = float(packet["humidity_pct"])
        
        # Enforce physical security boundaries (block sensor failures or malicious over/underflows)
        if not (-50.0 <= temp <= 100.0): return False
        if not (0.0 <= moisture <= 100.0): return False
        if not (0.0 <= humidity <= 100.0): return False
        
        # Sanitize data types to strict structured values
        packet["temperature_c"] = round(temp, 2)
        packet["soil_moisture_pct"] = round(moisture, 2)
        packet["humidity_pct"] = round(humidity, 2)
        if "irrigation_relay_active" in packet:
            packet["irrigation_relay_active"] = bool(packet["irrigation_relay_active"])
            
        return True
    except (ValueError, TypeError):
        return False

async def route_data(packet: dict):
    """Routes incoming serial packets to SSE queues and flags anomalies to the Intelligence Layer."""
    global last_alert_time
    
    # 1. Enforce strict input validation to block prompt injection and payload hacking
    if not validate_telemetry(packet):
        logger.warning("[Security Ingress] Dropped invalid, corrupted, or out-of-bounds telemetry packet.")
        return
        
    # Broadcast raw telemetry to all connected clients
    out_payload = {
        "type": "telemetry",
        "data": packet
    }
    
    # Check for environmental anomalies (soil moisture < 20.0)
    moisture = packet.get("soil_moisture_pct", 100.0)
    if moisture < 20.0:
        current_time = time.time()
        # Enforce alert cooldown to prevent API request spikes
        if current_time - last_alert_time > ALERT_COOLDOWN:
            last_alert_time = current_time
            # Generate AI message asynchronously to avoid clogging ingestion queues
            asyncio.create_task(process_ai_alert(packet))
            
    # Send telemetry update to queues
    for queue in list(sse_clients):
        await queue.put(out_payload)

async def process_ai_alert(packet: dict):
    """Helper worker to run LLM diagnostics and queue the response to the UI."""
    ai_response = await generate_ai_diagnostic(packet)
    alert_payload = {
        "type": "alert",
        "data": {
            "timestamp": int(time.time() * 1000),
            "message": ai_response,
            "severity": "CRITICAL"
        }
    }
    logger.info(f"[Intelligence Layer] AI Diagnostic: {ai_response}")
    for queue in list(sse_clients):
        await queue.put(alert_payload)

async def serial_polling_loop():
    """Asynchronously polls the virtual COM port. Falls back to mock telemetry if no device is connected."""
    logger.info("[Ingestion Backend] Commencing hardware serial interface task...")
    
    # Try importing serial dependencies
    serial_available = False
    try:
        import serial
        serial_available = True
    except ImportError:
        logger.warning("[Ingestion Backend] 'pyserial' package missing. Operating in Mock Hardware mode.")

    while True:
        if serial_available:
            try:
                # Open connection asynchronously
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1.0)
                logger.info(f"[Ingestion Backend] Connected successfully to RP2040 on {SERIAL_PORT}")
                
                while True:
                    if ser.in_waiting > 0:
                        raw_line = ser.readline()
                        try:
                            decoded = raw_line.decode("utf-8").strip()
                            packet = json.loads(decoded)
                            await route_data(packet)
                        except (UnicodeDecodeError, json.JSONDecodeError) as err:
                            # Frame synchronization / byte error recovery
                            logger.warn(f"[Ingestion Backend] Bit corruption detected. Dropped packet: {err}")
                    await asyncio.sleep(0.05) # Keep event loops breathable
            except Exception as e:
                logger.error(f"[Ingestion Backend] Port {SERIAL_PORT} unavailable or disconnected: {e}")
                logger.info("[Ingestion Backend] Retrying in 5s... Falling back to simulation node.")
        
        # Fallback Mock telemetry stream
        await mock_telemetry_loop()
        await asyncio.sleep(5.0)

async def mock_telemetry_loop():
    """Simulates the physical Raspberry Pi Pico environmental state machine output."""
    logger.info("[Ingestion Backend] Running Mock Environmental Simulation Node...")
    soil_moisture = 85.0
    humidity = 50.0
    
    while True:
        # Simulate RP2040 temperature sensor reading fluctuations
        temperature_c = 22.0 + random.uniform(-0.5, 0.5)
        
        # Sim moisture decay
        delta_m = random.uniform(0.2, 1.6)
        soil_moisture -= delta_m
        
        # Irrigation trigger
        irrigation_active = False
        if soil_moisture < 15.0:
            soil_moisture = 85.0
            irrigation_active = True
            
        # Sim humidity
        humidity += random.gauss(0.0, 0.4)
        humidity = max(10.0, min(95.0, humidity))
        
        payload = {
            "timestamp_ms": int(time.time() * 1000) % 1000000,
            "temperature_c": round(temperature_c, 2),
            "soil_moisture_pct": round(soil_moisture, 2),
            "humidity_pct": round(humidity, 2),
            "irrigation_relay_active": irrigation_active,
            "status_flag": "OK" if soil_moisture >= 20.0 else "WARNING_LOW_MOISTURE"
        }
        
        await route_data(payload)
        await asyncio.sleep(2.0)

# Lifespan handles the startup cycle now; deprecated startup decorator is removed.

@app.get("/api/telemetry")
async def get_telemetry_stream(request: Request):
    """Exposes the live Server-Sent Events (SSE) streaming API channel."""
    async def sse_event_generator():
        queue = asyncio.Queue()
        sse_clients.add(queue)
        logger.info(f"[Ingestion Backend] Client connected to live SSE. Total active: {len(sse_clients)}")
        try:
            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    break
                # Fetch payload packet
                packet = await queue.get()
                yield f"data: {json.dumps(packet)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_clients.remove(queue)
            logger.info(f"[Ingestion Backend] Client disconnected from SSE. Total active: {len(sse_clients)}")

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    # Executed as local server instance
    uvicorn.run(app, host="127.0.0.1", port=8000)
