let latency = 5;
setInterval(() => {
  latency = Math.max(1, latency + (Math.random() > 0.5 ? 1 : -1));
  console.log(`[SIMULATION] Database replication latency: ${latency}ms | Cluster Status: HEALTHY`);
}, 1500);