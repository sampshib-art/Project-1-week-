# Agritech IoT Telemetry Node: Architectural Blueprint

This is the absolute architectural blueprint of the **Agritech IoT Telemetry Node**. The system operates as a decoupled, unidirectional reactive data pipeline designed to sample physical micro-climates, run automated local irrigation gates on physical silicon, stream data to an ingestion server, and perform offline intelligence evaluations.

This project was built to explore the boundaries of low-level hardware interaction, real-time data ingestion, local AI diagnostics, and production-grade rendering. It showcases how developers can bridge physical environmental changes with offline Large Language Models for automated, intelligent site management.

---

## System Architecture

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

## Real-World Utility (How It's Useful IRL)

In commercial farming and indoor greenhouses, this architecture represents a **Precision Micro-Irrigation Node**. 
Instead of watering large sections of land on a simple clock timer (which wastes water and risks root rot), this system allows for:
1.  **High-Frequency Moisture Tracking**: Measures moisture exactly at the plant roots, reacting to soil physics.
2.  **Edge Fallback Safety**: If the network connection goes down, the physical Raspberry Pi Pico continues monitoring the sensors and opening the local water valves autonomously, protecting the crops from communication failures.
3.  **Local AI Advisory**: Telemetry is analyzed by a local model that generates crop health warnings and mitigation steps, allowing remote sites to run advanced analytics completely offline.

---

## Production Hardware Wiring & Setup (Real Silicon)

To assemble this project using physical components, follow this wiring blueprint:

### 1. Physical Hardware Components List
*   **Microcontroller**: Raspberry Pi Pico (RP2040)
*   **Soil Moisture Sensor**: Capacitive Soil Moisture Sensor v1.2 (corrosion-resistant)
*   **Relay Module**: 5V Single-Channel Relay Module (optocoupler isolated)
*   **Solenoid Valve**: 12V DC Brass Water Solenoid Valve (normally closed)
*   **Power Supplies**: 
    *   Micro-USB cable to power the Pico (5V).
    *   External 12V DC power adapter to drive the solenoid valve.

### 2. GPIO Wiring Blueprint
Connect the pins on the Raspberry Pi Pico as follows:

```
+───────────────────────────+────────────────────────────────+
|  Raspberry Pi Pico Pin    |    Target Component Pin        |
+───────────────────────────+────────────────────────────────+
|  3.3V OUT (Pin 36)        |  Moisture Sensor VCC           |
|  GND (Pin 38)             |  Moisture Sensor GND           |
|  GP26 / ADC0 (Pin 31)     |  Moisture Sensor AOUT (Analog) |
|                           |                                |
|  5V VBUS (Pin 40)         |  Relay Module VCC (5V Power)   |
|  GND (Pin 38)             |  Relay Module GND              |
|  GP15 (Pin 20)            |  Relay Module IN (Control)     |
+───────────────────────────+────────────────────────────────+
```

### 3. Solenoid Valve Power Circuit
The Pico cannot output enough current to drive a 12V solenoid directly. The relay acts as an isolated switch:
1.  Connect the **Positive (+)** wire of the 12V power supply to the **Common (COM)** terminal of the relay.
2.  Connect the **Normally Open (NO)** terminal of the relay to the **Positive (+)** terminal of the Solenoid Valve.
3.  Connect the **Negative (-)** wire of the 12V power supply directly to the **Negative (-)** terminal of the Solenoid Valve.

*When GP15 is driven HIGH by the Pico, the relay closes the loop, allowing 12V current to flow and open the solenoid valve to start watering.*

---

## Firmware Configuration & Calibration

In a real setup, capacitive sensors must be calibrated to get accurate percentages. Update the sensor reading block in [firmware/main.py](file:///D:/Project%201%20week/projects/agritech-iot-node/firmware/main.py):

```python
# Real capacitive sensor scaling
# Measure raw values in air (dry) and in a cup of water (wet)
AIR_VALUE = 52000    # Dry threshold reading
WATER_VALUE = 21000  # Wet threshold reading

def get_soil_moisture_percentage(raw_adc_val):
    if raw_adc_val >= AIR_VALUE:
        return 0.0
    if raw_adc_val <= WATER_VALUE:
        return 100.0
    # Calculate percentage linearly
    return ((AIR_VALUE - raw_adc_val) / (AIR_VALUE - WATER_VALUE)) * 100.0
```

---

## Operational Logic

### Ingestion Node Startup
Start the backend server to listen for hardware serial packets or simulated logs:
```bash
cd projects/agritech-iot-node/backend
python app.py
```
*(Configure `SERIAL_PORT` in [app.py](file:///D:/Project%201%20week/projects/agritech-iot-node/backend/app.py) to match your COM port).*
