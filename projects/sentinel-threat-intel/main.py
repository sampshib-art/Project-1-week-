import asyncio
import json
import logging
import os
import sys
import time
import random
from typing import Dict, List, Set
import httpx
import psutil

# Configure logging with industrial formatting
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("Sentinel-Daemon")

# ANSI terminal colors for beautiful console aesthetics
COLOR_RESET = "\033[0m"
COLOR_CYAN = "\033[36m"
COLOR_RED = "\033[31m"
COLOR_YELLOW = "\033[33m"
COLOR_GREEN = "\033[32m"
COLOR_MAGENTA = "\033[35m"
COLOR_BOLD = "\033[1m"

class Configuration:
    """Manages system configuration loading and validation."""
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.config_data = {}
        self.load()

    def load(self):
        try:
            if os.path.exists(self.filepath):
                with open(self.filepath, "r") as f:
                    self.config_data = json.load(f)
                logger.info(f"Loaded configuration from {self.filepath}")
            else:
                # Default fallback configs
                self.config_data = {
                    "discord_webhook_url": "",
                    "ollama_api_url": "http://localhost:11434/api/generate",
                    "poll_interval_seconds": 5.0,
                    "failed_login_threshold": 3
                }
                self.save()
                logger.warning(f"Config file not found. Created defaults at {self.filepath}")
        except Exception as e:
            logger.error(f"Error loading configuration: {e}. Using runtime defaults.")

    def save(self):
        try:
            with open(self.filepath, "w") as f:
                json.dump(self.config_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write configuration file: {e}")

    @property
    def discord_url(self) -> str:
        return self.config_data.get("discord_webhook_url", "")

    @property
    def ollama_url(self) -> str:
        return self.config_data.get("ollama_api_url", "http://localhost:11434/api/generate")

    @property
    def poll_interval(self) -> float:
        return float(self.config_data.get("poll_interval_seconds", 5.0))

    @property
    def failed_login_threshold(self) -> int:
        return int(self.config_data.get("failed_login_threshold", 3))


class TelemetryCollector:
    """Monitors raw OS telemetry, including socket states and simulated auth vectors."""
    def __init__(self, login_threshold: int):
        self.login_threshold = login_threshold
        self.known_connections: Set[str] = set()
        self.failed_login_cache: Dict[str, List[float]] = {}  # IP -> list of timestamps

    def scan_active_sockets(self) -> List[Dict]:
        """Scans active network connections and identifies suspicious connection states."""
        anomalies = []
        try:
            connections = psutil.net_connections(kind="inet")
            current_active = set()
            
            for conn in connections:
                # Skip unbound/listening sockets; track active remote connections
                if conn.status == "ESTABLISHED" and conn.raddr:
                    ip, port = conn.raddr
                    conn_id = f"{ip}:{port}"
                    current_active.add(conn_id)
                    
                    # Flag high-risk port connections (e.g. SSH, RDP, Telnet, or raw database access)
                    high_risk_ports = {21, 22, 23, 3389, 445, 1433, 3306}
                    if port in high_risk_ports and conn_id not in self.known_connections:
                        anomalies.append({
                            "type": "HIGH_RISK_PORT_ESTABLISHED",
                            "source_ip": ip,
                            "destination_port": port,
                            "status": conn.status,
                            "timestamp": time.time()
                        })
            
            # Maintain connection state differences
            new_conns = current_active - self.known_connections
            if new_conns:
                logger.debug(f"Detected {len(new_conns)} new connection mappings.")
                
            self.known_connections = current_active
        except Exception as e:
            logger.error(f"Failed to scan network sockets: {e}")
        return anomalies

    def simulate_or_parse_failed_login(self) -> List[Dict]:
        """Simulates external authentication logs (e.g. SSH brute force attack simulations)."""
        anomalies = []
        # Randomly trigger a brute force simulation (10% chance per poll loop to keep logs interactive)
        if random.random() < 0.12:
            attacker_ip = f"185.220.101.{random.randint(10, 250)}"
            now = time.time()
            
            if attacker_ip not in self.failed_login_cache:
                self.failed_login_cache[attacker_ip] = []
                
            # Simulate a cluster of quick failed logins
            burst_count = random.randint(3, 5)
            for i in range(burst_count):
                self.failed_login_cache[attacker_ip].append(now - i * 0.5)
                
            logger.warning(f"AUTHENTICATION_LOG: Multiple failed login attempts recorded from {attacker_ip}")

        # Check in-memory rules threshold gates (e.g. 3 attempts in rolling 15 seconds)
        now = time.time()
        for ip, attempts in list(self.failed_login_cache.items()):
            # Filter attempts older than 15 seconds
            active_attempts = [t for t in attempts if now - t <= 15.0]
            self.failed_login_cache[ip] = active_attempts
            
            if len(active_attempts) >= self.login_threshold:
                anomalies.append({
                    "type": "BRUTE_FORCE_ATTACK_SUSPECTED",
                    "source_ip": ip,
                    "event_count": len(active_attempts),
                    "time_window_seconds": 15.0,
                    "timestamp": now
                })
                # Clear cache for this IP to prevent repetitive alerts
                del self.failed_login_cache[ip]
                
        return anomalies


class AIEngine:
    """Handles communications with the local Ollama LLM node to analyze system alerts."""
    def __init__(self, ollama_url: str):
        self.ollama_url = ollama_url

    async def analyze_threat(self, payload: Dict) -> Dict:
        """Sends the normalized log to Ollama Llama3 for real-time risk classification."""
        system_prompt = (
            "You are Sentinel-AI, an automated ICT Security Specialist running on an air-gapped system. "
            "You analyze JSON telemetry logs. Output a strict JSON response containing exactly these fields: "
            "1. 'threat_level' (LOW, MEDIUM, HIGH, CRITICAL), "
            "2. 'attack_vector' (a 2-word classification, e.g. 'Brute Force' or 'Port Scan'), "
            "3. 'mitigation_step' (a concise, 1-sentence technical instruction). "
            "Do not include conversational text, backticks, or markdown formatting."
        )
        
        prompt = f"System Instruction: {system_prompt}\nTelemetry Log: {json.dumps(payload)}"
        
        api_payload = {
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
        
        logger.info("[AI Intelligence Layer] Querying local Ollama Llama3 for diagnostics...")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.ollama_url, json=api_payload, timeout=8.0)
                if response.status_code == 200:
                    result = response.json()
                    response_text = result.get("response", "").strip()
                    
                    # Try to locate and parse JSON output from the text
                    # Remove potential markdown wraps
                    clean_text = response_text
                    if "```json" in clean_text:
                        clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in clean_text:
                        clean_text = clean_text.split("```")[1].split("```")[0].strip()
                        
                    try:
                        parsed = json.loads(clean_text)
                        return {
                            "threat_level": parsed.get("threat_level", "MEDIUM"),
                            "attack_vector": parsed.get("attack_vector", "UNSPECIFIED_ANOMALY"),
                            "mitigation_step": parsed.get("mitigation_step", "Check logs and restrict source IP.")
                        }
                    except json.JSONDecodeError:
                        logger.warning(f"Could not parse strict JSON from LLM: {response_text}. Formatting fallback.")
                        # Fallback parsing regex-like heuristics
                        threat = "MEDIUM"
                        if "CRITICAL" in response_text.upper(): threat = "CRITICAL"
                        elif "HIGH" in response_text.upper(): threat = "HIGH"
                        elif "LOW" in response_text.upper(): threat = "LOW"
                        return {
                            "threat_level": threat,
                            "attack_vector": "ANOMALY_DETECTED",
                            "mitigation_step": response_text[:120]
                        }
                else:
                    return {
                        "threat_level": "HIGH",
                        "attack_vector": "API_ERROR",
                        "mitigation_step": f"Ollama API returned response code {response.status_code}."
                    }
        except Exception as e:
            logger.error(f"[AI Intelligence Layer] Ollama inference failed: {e}")
            return {
                "threat_level": "HIGH",
                "attack_vector": "LOCAL_LLM_OFFLINE",
                "mitigation_step": "Action: Enable local Ollama server by running 'ollama run llama3' offline."
            }


class Dispatcher:
    """Handles notification outputs to local consoles and external Discord Webhooks."""
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    def print_cool_console_banner(self, raw_alert: Dict, ai_report: Dict):
        """Prints a beautiful, cyber-themed console card."""
        threat = ai_report.get("threat_level", "LOW")
        color = COLOR_GREEN
        if threat == "CRITICAL":
            color = COLOR_RED
        elif threat == "HIGH":
            color = COLOR_YELLOW
        elif threat == "MEDIUM":
            color = COLOR_CYAN
            
        print(f"\n{color}{COLOR_BOLD}┌{"─" * 68}┐{COLOR_RESET}")
        print(f"{color}{COLOR_BOLD}│                       SENTINEL AI THREAT ALERT                     │{COLOR_RESET}")
        print(f"{color}{COLOR_BOLD}├{"─" * 68}┤{COLOR_RESET}")
        print(f"{color}│ {COLOR_BOLD}THREAT LEVEL:{COLOR_RESET}  {threat:<51} {color}│{COLOR_RESET}")
        print(f"{color}│ {COLOR_BOLD}VECTOR:      {COLOR_RESET}  {ai_report.get('attack_vector', 'N/A'):<51} {color}│{COLOR_RESET}")
        print(f"{color}│ {COLOR_BOLD}SOURCE IP:   {COLOR_RESET}  {raw_alert.get('source_ip', 'N/A'):<51} {color}│{COLOR_RESET}")
        print(f"{color}│ {COLOR_BOLD}METRIC TYPE: {COLOR_RESET}  {raw_alert.get('type', 'N/A'):<51} {color}│{COLOR_RESET}")
        print(f"{color}│ {COLOR_BOLD}MITIGATION:  {COLOR_RESET}  {ai_report.get('mitigation_step', 'N/A'):<51} {color}│{COLOR_RESET}")
        print(f"{color}{COLOR_BOLD}└{"─" * 68}┘{COLOR_RESET}\n")

    async def dispatch_discord_alert(self, raw_alert: Dict, ai_report: Dict):
        """Fires an OAuth-authorized Discord Webhook embed to the security channel."""
        if not self.webhook_url:
            logger.info("Discord Webhook URL not configured. Skipping external alerts.")
            return

        threat = ai_report.get("threat_level", "LOW")
        color_decimal = 65280  # Green
        if threat == "CRITICAL":
            color_decimal = 16711680  # Red
        elif threat == "HIGH":
            color_decimal = 16753920  # Orange
        elif threat == "MEDIUM":
            color_decimal = 65535  # Cyan

        embed = {
            "title": f"🚨 Sentinel Security Node: {threat} Threat Detected",
            "description": f"Anomalous system activity evaluated by localized AI.",
            "color": color_decimal,
            "fields": [
                {"name": "Attack Vector", "value": ai_report.get("attack_vector", "N/A"), "inline": True},
                {"name": "Source IP Address", "value": raw_alert.get("source_ip", "N/A"), "inline": True},
                {"name": "System Metric Type", "value": raw_alert.get("type", "N/A"), "inline": False},
                {"name": "Recommended Action (AI)", "value": ai_report.get("mitigation_step", "N/A"), "inline": False}
            ],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "footer": {
                "text": "Sentinel Security Daemon v1.0.0"
            }
        }

        payload = {"embeds": [embed]}
        
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(self.webhook_url, json=payload, timeout=5.0)
                if res.status_code in [200, 204]:
                    logger.info("Sent alert embed to Discord Webhook successfully.")
                else:
                    logger.error(f"Discord API returned error code {res.status_code}")
        except Exception as e:
            logger.error(f"Failed to post alert embed to Discord: {e}")


async def main():
    print(f"\n{COLOR_CYAN}{COLOR_BOLD}=== SENTINEL THREAT INTELLIGENCE DAEMON SYSTEM LAUNCH ==={COLOR_RESET}")
    print(f"{COLOR_CYAN}Targeting NZ ANZSCO 262112 (ICT Security Specialist) Core Metrics{COLOR_RESET}\n")

    # Load Configs
    config = Configuration("config.json")
    
    # Initialize Engines
    collector = TelemetryCollector(login_threshold=config.failed_login_threshold)
    ai_engine = AIEngine(ollama_url=config.ollama_url)
    dispatcher = Dispatcher(webhook_url=config.discord_url)

    logger.info("Background thread loop started. Polling system sockets and authentication sinks...")

    while True:
        try:
            # 1. Gather Telemetry
            socket_anomalies = collector.scan_active_sockets()
            auth_anomalies = collector.simulate_or_parse_failed_login()
            
            # Combine all findings
            all_alerts = socket_anomalies + auth_anomalies
            
            # 2. Process Alerts
            for alert in all_alerts:
                logger.warning(f"Anomaly detected! Type: {alert['type']} | Source: {alert['source_ip']}")
                
                # Analyze utilizing Ollama LLM
                ai_report = await ai_engine.analyze_threat(alert)
                
                # Dispatch alert internally and externally
                dispatcher.print_cool_console_banner(alert, ai_report)
                await dispatcher.dispatch_discord_alert(alert, ai_report)
                
        except Exception as e:
            logger.error(f"Error inside daemon monitoring loop: {e}")
            
        await asyncio.sleep(config.poll_interval)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{COLOR_RED}=== SENTINEL DAEMON TERMINATED GRACEFULLY ==={COLOR_RESET}\n")
        sys.exit(0)
