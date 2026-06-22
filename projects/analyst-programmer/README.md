# Distributed Analytics Engine (Analyst Programmer)

This is the architectural blueprint of the **Distributed Analytics Engine (Analyst Programmer)**.

A high-throughput distributed analytics engine built for processing real-time financial market data.

This project bridges theoretical software engineering with physical hardware implementation, demonstrating real-world utility.

---

## Physical Hardware Wiring & Setup
To build this locally, set up a 4-node Raspberry Pi 4 cluster connected via a Gigabit network switch. 
1. Flash Ubuntu Server on 4 microSD cards.
2. Connect each Pi to the Gigabit switch using CAT6 Ethernet cables.
3. Configure static IPs for inter-node communication.
4. Deploy Kafka brokers on nodes 1-3, and the analytics consumer on node 4.

---

## Simulation Code

If you do not have the physical hardware, you can run the software simulation layer to mock the data streams and verify the logic.

```bash
cd projects/analyst-programmer/simulation
node sim.js  # Or python sim.py
```
