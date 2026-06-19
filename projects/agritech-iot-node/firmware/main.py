import machine
import time
import json
import random

# Initialize ADC Channel 4 connected to the internal temperature sensor
temp_sensor = machine.ADC(4)

# Initial state variables
soil_moisture = 85.0  # Percentage (%)
humidity = 50.0       # Percentage (%)

print("[Edge Firmware] Systems Diagnostic Node Initialized. Commencing telemetry loops...")

# Unbiased Gaussian noise approximation using Box-Muller transform for humidity
def gaussian_noise(mean=0.0, std_dev=1.0):
    u1 = random.random()
    u2 = random.random()
    # Avoid log(0)
    if u1 == 0: u1 = 0.0001
    import math
    z0 = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
    return z0 * std_dev + mean

while True:
    try:
        # 1. Analog-to-Digital Conversion with 10-sample oversampling filter
        total_reading = 0
        for _ in range(10):
            total_reading += temp_sensor.read_u16()
            time.sleep_ms(5)  # Short settling delay
        reading = total_reading / 10.0
        
        # Scale to voltage: 0-65535 reading represents 0-3.3V
        voltage = (reading / 65535.0) * 3.3
        
        # Validate raw sensor bounds (e.g. detect short-circuits or disconnected pins)
        if voltage < 0.1 or voltage > 3.2:
            raise ValueError("ADC sensor voltage out of physical range (0.1V - 3.2V)")
            
        # Translate voltage to Celsius using RP2040 datasheet specifications:
        # Vtemp = 0.706V at 27 degrees C, slope = -1.721mV per degree C
        temperature_c = 27.0 - ((voltage - 0.706) / 0.001721)
        
        # 2. Math-Driven Environmental State Machine
        # Soil moisture decay modeled as a random walk with a downward bias
        delta_m = random.uniform(0.1, 1.5)
        soil_moisture -= delta_m
        
        # Automated Irrigation Loop trigger: reset to 85% if moisture drops below 15%
        irrigation_active = False
        if soil_moisture < 15.0:
            soil_moisture = 85.0
            irrigation_active = True
            
        # Simulate ambient humidity fluctuation using Gaussian noise model (mean = 0, std_dev = 0.5)
        humidity += gaussian_noise(0.0, 0.5)
        # Cap humidity to realistic atmospheric percentages
        humidity = max(10.0, min(95.0, humidity))
        
        # 3. Serialize and transport payload via UART over USB Serial
        payload = {
            "timestamp_ms": time.ticks_ms(),
            "temperature_c": round(temperature_c, 2),
            "soil_moisture_pct": round(soil_moisture, 2),
            "humidity_pct": round(humidity, 2),
            "irrigation_relay_active": irrigation_active,
            "status_flag": "OK" if soil_moisture >= 20.0 else "WARNING_LOW_MOISTURE"
        }
        
        # Output directly to stdout which maps to USB Serial / UART TX channel
        print(json.dumps(payload))
        
    except Exception as e:
        # Fault isolation handling
        error_log = {
            "error": "SENSOR_READ_FAILED",
            "message": str(e)
        }
        print(json.dumps(error_log))
        
    # Poll interval: 2000 milliseconds
    time.sleep(2.0)
