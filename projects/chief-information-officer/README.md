# Enterprise IT Governance Framework (Chief Information Officer)

This is the architectural blueprint of the **Enterprise IT Governance Framework (Chief Information Officer)**.

An automated compliance and IT governance dashboard.

This project bridges theoretical software engineering with physical hardware implementation, demonstrating real-world utility.

---

## Physical Hardware Wiring & Setup
Connect physical SNMP environmental sensors (temperature/humidity) located in the server rack to the governance node.
1. Wire the RJ45 port of the APC NetBotz sensor to your management VLAN.
2. In the firmware, set the Trap destination to the IP of the governance server.
3. The governance server will ingest physical rack health along with software compliance metrics.

---

## Simulation Code

If you do not have the physical hardware, you can run the software simulation layer to mock the data streams and verify the logic.

```bash
cd projects/chief-information-officer/simulation
node sim.js  # Or python sim.py
```
