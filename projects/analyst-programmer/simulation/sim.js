const crypto = require("crypto");
setInterval(() => {
  console.log(`[SIMULATION] Processing trade: ${crypto.randomBytes(4).toString("hex")} | Status: SUCCESS`);
}, 1000);