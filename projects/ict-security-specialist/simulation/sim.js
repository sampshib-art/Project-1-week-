const users = ["Alice", "Bob", "Charlie"];
setInterval(() => {
  const user = users[Math.floor(Math.random() * users.length)];
  console.log(`[SIMULATION] Intercepted request from ${user} -> Enforcing Zero-Trust TLS Handshake... Verified.`);
}, 2000);