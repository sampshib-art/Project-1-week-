# Automated Infrastructure Provisioning (Systems Administrator)

This is the architectural blueprint of the **Automated Infrastructure Provisioning (Systems Administrator)**.

An infrastructure-as-code (IaC) pipeline using Terraform and PXE booting.

This project bridges theoretical software engineering with physical hardware implementation, demonstrating real-world utility.

---

## Physical Hardware Wiring & Setup
Setup a PXE (Preboot Execution Environment) Boot Server.
1. Connect a management server (PXE Server) and 5 blank physical servers to a Layer 2 switch.
2. Configure the BIOS of the 5 servers to "Boot from LAN/PXE".
3. When powered on, the servers will broadcast a physical DHCP request, retrieve the OS image via TFTP from the PXE server, and install the OS automatically.

---

## Simulation Code

If you do not have the physical hardware, you can run the software simulation layer to mock the data streams and verify the logic.

```bash
cd projects/systems-administrator/simulation
node sim.js  # Or python sim.py
```
