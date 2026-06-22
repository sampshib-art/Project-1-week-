let servers = 0;
setInterval(() => {
  if (servers < 5) {
    servers++;
    console.log(`[SIMULATION] PXE Booting server ${servers}/5... OS installed via TFTP.`);
  } else {
    console.log(`[SIMULATION] All infrastructure provisioned. Monitoring health...`);
  }
}, 1500);