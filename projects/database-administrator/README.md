# High-Availability Database Cluster (Database Administrator)

This is the architectural blueprint of the **High-Availability Database Cluster (Database Administrator)**.

A distributed database clustering solution ensuring 99.999% uptime.

This project bridges theoretical software engineering with physical hardware implementation, demonstrating real-world utility.

---

## Physical Hardware Wiring & Setup
This requires at least 3 physical bare-metal servers and a NAS array.
1. Connect the NAS to the servers using a dedicated 10GbE SFP+ switch (Storage Area Network).
2. Configure hardware RAID 10 on the NAS for redundancy.
3. Ensure each server has dual redundant power supplies connected to separate UPS units.

---

## Simulation Code

If you do not have the physical hardware, you can run the software simulation layer to mock the data streams and verify the logic.

```bash
cd projects/database-administrator/simulation
node sim.js  # Or python sim.py
```
