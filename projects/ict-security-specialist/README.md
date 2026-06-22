# Zero-Trust Network Mesh (ICT Security Specialist)

This is the architectural blueprint of the **Zero-Trust Network Mesh (ICT Security Specialist)**.

A comprehensive zero-trust network architecture implementation.

This project bridges theoretical software engineering with physical hardware implementation, demonstrating real-world utility.

---

## Physical Hardware Wiring & Setup
Integrate a Hardware Security Module (HSM) such as a YubiHSM 2.
1. Insert the YubiHSM 2 into the central authentication server USB port.
2. Wire a physical biometric access panel (e.g., fingerprint scanner) to the entry gate using Wiegand protocol wiring.
3. The proxy server will reject all network requests unless the physical biometric log matches the cryptographic token signed by the HSM.

---

## Simulation Code

If you do not have the physical hardware, you can run the software simulation layer to mock the data streams and verify the logic.

```bash
cd projects/ict-security-specialist/simulation
node sim.js  # Or python sim.py
```
