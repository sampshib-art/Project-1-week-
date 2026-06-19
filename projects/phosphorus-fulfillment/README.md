# Phosphorus: Low-Latency Digital Asset Fulfillment Framework

Phosphorus is an open-source, asynchronous digital asset fulfillment framework engineered in Python. It is designed to handle high-concurrency order webhooks from digital storefronts (such as marketplaces, custom storefronts, or inventory hubs), ingest them into a thread-safe FIFO queue, enforce atomic database locks to prevent inventory race conditions, and execute programmatic asset transfers under a strict 3-second Service Level Agreement (SLA).

This framework generalizes the transactional logic used in commercial asset trading nodes, stripping out private credentials and structuring it into a reusable, self-contained API package.

---

## System Architecture

The Phosphorus framework operates as a concurrent producer-consumer pipeline:

```
 [ Storefront Webhook ] (Eldorado / Shopify / Custom API Order)
           │
           ▼ (HTTP POST /api/order)
 [ FastAPI Ingress ] (Schema Validation & Instant Acknowledgment)
           │
           ▼ (Non-blocking Queue Push)
 [ FIFO Transaction Queue ] (asyncio.Queue Memory Buffer)
           │
           ▼ (Consumes events sequentially)
 [ Concurrency Core ] ──► [ SQLite Database ] (Atomic Inventory Lock)
           │
           ▼ (On Success)
 [ Dispatch / Fulfillment ] ──► (Mock API Transfer Hook & Callback)
```

---

## Core Technical Features

### 1. Instant Acknowledgment (Fast Ingress)
To satisfy marketplace SLA deadlines, the `/api/order` endpoint executes minimal blocking work. It validates the request payload, generates a unique job tracking ID, pushes the transaction to an in-memory queue (`asyncio.Queue`), and immediately returns a `202 Accepted` response to the client. The actual transfer is processed asynchronously.

### 2. Transaction Queue (FIFO Buffer)
An asynchronous background worker runs continuously, consuming orders from the FIFO memory queue. This isolates high-volume incoming webhooks from the slower external asset APIs, preventing system crashes during traffic spikes.

### 3. Inventory Lock & Race Condition Prevention
When multiple clients order the same digital asset at the exact same millisecond, standard databases can experience a race condition, leading to **double-selling** or **negative stock levels**. 
Phosphorus solves this using **SQLite transaction locks** with write isolation:
```sql
-- Enforces checking and updating in a single transaction block
BEGIN IMMEDIATE TRANSACTION;
SELECT stock_qty FROM inventory WHERE asset_id = ?;
-- If stock_qty >= ordered_qty:
UPDATE inventory SET stock_qty = stock_qty - ? WHERE asset_id = ?;
COMMIT;
```

---

## Installation & Setup

### Prerequisites
*   Python 3.10+
*   FastAPI & Uvicorn

### Installation
1.  Navigate to the project folder:
    ```bash
    cd projects/phosphorus-fulfillment
    ```
2.  Install required libraries:
    ```bash
    pip install fastapi uvicorn httpx
    ```
3.  Configure variables inside `config.json`:
    ```json
    {
      "database_path": "fulfillment.db",
      "max_retries": 3,
      "callback_webhook_url": ""
    }
    ```
4.  Run the server:
    ```bash
    python app.py
    ```

---

## API Documentation

### 1. Ingest Order
*   **Endpoint**: `POST /api/order`
*   **Payload**:
    ```json
    {
      "order_id": "TXN-882941",
      "buyer_username": "buyer_one",
      "asset_id": "ITEM_KEY_09",
      "quantity": 1
    }
    ```
*   **Response (202 Accepted)**:
    ```json
    {
      "status": "QUEUED",
      "order_id": "TXN-882941",
      "message": "Transaction injected into fulfillment worker pipeline."
    }
    ```

### 2. View Inventory Levels
*   **Endpoint**: `GET /api/inventory`
*   **Response**:
    ```json
    [
      {
        "asset_id": "ITEM_KEY_09",
        "asset_name": "Premium License Key",
        "stock_qty": 142
      }
    ]
    ```
