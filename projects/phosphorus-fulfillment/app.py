import asyncio
import json
import logging
import sqlite3
import os
import hmac
import hashlib
from typing import Dict, List
import httpx
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("Phosphorus-Core")

DB_FILE = "fulfillment.db"
CONFIG_FILE = "config.json"

# In-memory FIFO queue bounded to 100 entries to prevent memory flooding DOS attacks
order_queue: asyncio.Queue = asyncio.Queue(maxsize=100)

# Load secret webhook signing key
SECRET_KEY = "phosphorus_secure_secret_token"
try:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            cfg = json.load(f)
            SECRET_KEY = cfg.get("secret_key", SECRET_KEY)
except Exception as e:
    logger.error(f"Failed to load secret key: {e}. Using temporary default.")

# Pydantic schema validation for secure ingress inputs
class OrderRequest(BaseModel):
    order_id: str = Field(..., min_length=3, max_length=50)
    buyer_username: str = Field(..., min_length=2, max_length=50)
    asset_id: str = Field(..., min_length=3, max_length=50)
    quantity: int = Field(..., gt=0)

def init_db():
    """Initializes the SQLite database with transaction safety features and sample inventory."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Enable WAL mode (Write-Ahead Logging) to allow concurrent reads during writes
    cursor.execute("PRAGMA journal_mode=WAL;")
    
    # Create inventory table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        asset_id TEXT PRIMARY KEY,
        asset_name TEXT NOT NULL,
        stock_qty INTEGER NOT NULL CHECK (stock_qty >= 0)
    );
    """)
    
    # Create transactions audit log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        transaction_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        buyer_username TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Insert mock digital inventory items if empty
    cursor.execute("SELECT COUNT(*) FROM inventory;")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
        INSERT INTO inventory (asset_id, asset_name, stock_qty)
        VALUES (?, ?, ?);
        """, [
            ("ITEM_KEY_01", "Optic Aim Trainer Premium Key", 150),
            ("ITEM_KEY_02", "CS2 Aim Calibrator Script License", 75),
            ("ITEM_KEY_03", "Standard Discord Storefront Bot License", 30),
            ("ITEM_KEY_09", "Advanced Systems Shell Engine Key", 250)
        ])
        conn.commit()
        logger.info("Initialized database and populated digital assets.")
    conn.close()

async def execute_asset_delivery(order: Dict) -> bool:
    """Simulates delivery call to third-party digital networks (Steam/Discord API callbacks)."""
    logger.info(f"[Delivery API] Initiating connection handshake to digital asset pool for {order['order_id']}...")
    # Simulate API roundtrip latency (typically 200ms - 800ms)
    await asyncio.sleep(0.4)
    logger.info(f"[Delivery API] Asset successfully dispatched to buyer: {order['buyer_username']}")
    return True

async def transaction_worker():
    """Asynchronous background worker. Consumes orders sequentially from the FIFO queue.
    
    Processing writes in a single background worker completely avoids SQLite database lock
    contention while preserving strict ordering.
    """
    logger.info("Fulfillment background worker started. Listening to queue events...")
    
    while True:
        order = await order_queue.get()
        order_id = order["order_id"]
        buyer = order["buyer_username"]
        asset_id = order["asset_id"]
        qty = order["quantity"]
        
        logger.info(f"[Worker] Processing transaction {order_id} from queue.")
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        try:
            # Enforce an immediate write lock on the database to prevent race conditions
            cursor.execute("BEGIN IMMEDIATE TRANSACTION;")
            
            # Fetch stock level
            cursor.execute("SELECT stock_qty FROM inventory WHERE asset_id = ?;", (asset_id,))
            row = cursor.fetchone()
            
            if not row:
                raise ValueError(f"Asset ID {asset_id} does not exist in inventory.")
                
            current_stock = row[0]
            
            if current_stock >= qty:
                # Deduct stock level
                cursor.execute(
                    "UPDATE inventory SET stock_qty = stock_qty - ? WHERE asset_id = ?;",
                    (qty, asset_id)
                )
                
                # Write to transaction audit log
                cursor.execute(
                    "INSERT INTO transactions (transaction_id, order_id, buyer_username, asset_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?);",
                    (f"TXN-{order_id}", order_id, buyer, asset_id, qty, "SUCCESS")
                )
                
                # Commit database changes
                conn.commit()
                logger.info(f"[Worker] Stock updated. Reserved {qty} of {asset_id}. Committing.")
                
                # Execute the simulated API asset delivery
                delivery_success = await execute_asset_delivery(order)
                if not delivery_success:
                    logger.error(f"[Worker] Delivery callback failed for {order_id}.")
                    
            else:
                raise ValueError(f"Insufficient stock for {asset_id}. Ordered: {qty}, Available: {current_stock}")
                
        except Exception as e:
            # In case of failure, abort transaction and restore stock
            conn.rollback()
            logger.error(f"[Worker] Transaction {order_id} aborted: {e}")
            
            # Log failed transaction to audit logs
            try:
                cursor.execute("BEGIN IMMEDIATE TRANSACTION;")
                cursor.execute(
                    "INSERT INTO transactions (transaction_id, order_id, buyer_username, asset_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?);",
                    (f"TXN-{order_id}", order_id, buyer, asset_id, qty, "FAILED: " + str(e))
                )
                conn.commit()
            except Exception as audit_err:
                logger.error(f"[Worker] Failed to write audit failure log: {audit_err}")
                
        finally:
            conn.close()
            order_queue.task_done()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    init_db()
    # Spawn background processor task
    worker_task = asyncio.create_task(transaction_worker())
    yield
    # Shutdown tasks
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Phosphorus Digital Asset Fulfillment Core",
    version="1.0.0",
    lifespan=lifespan
)

# Restrict CORS to specific local trusted origins to prevent malicious cross-origin scripts
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.post("/api/order", status_code=status.HTTP_202_ACCEPTED)
async def create_order(request: Request, order_request: OrderRequest):
    """Ingests order payload, verifies secure HMAC signature, and queues order for fulfillment."""
    
    # 1. Cryptographic HMAC Signature Verification to prevent Webhook Spoofing
    signature = request.headers.get("X-Signature")
    if not signature:
        logger.error("[Ingress Security] Webhook signature missing in headers.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing security signature header (X-Signature)."
        )
        
    raw_body = await request.body()
    computed_signature = hmac.new(
        SECRET_KEY.encode("utf-8"), 
        raw_body, 
        hashlib.sha256
    ).hexdigest()
    
    # Secure constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(computed_signature, signature):
        logger.error("[Ingress Security] Invalid webhook signature detected. Rejecting payload.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid signature hash. Unauthorized webhook origin."
        )

    # 2. Check queue saturation to prevent Out-of-Memory DOS
    if order_queue.full():
        logger.error("[Ingress Security] In-memory transaction queue full. Saturated.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pipeline queue saturated. Try again later."
        )
    
    # Push validated order object to FIFO Queue
    await order_queue.put(order_request.dict())
    
    return {
        "status": "QUEUED",
        "order_id": order_request.order_id,
        "message": "Transaction verified and successfully queued."
    }

@app.get("/api/inventory")
async def get_inventory():
    """Queries and returns active stock levels across the inventory database."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT asset_id, asset_name, stock_qty FROM inventory;")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.get("/api/transactions")
async def get_transactions():
    """Queries and returns the transaction audit logs."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT order_id, buyer_username, asset_id, quantity, status, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 50;")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
