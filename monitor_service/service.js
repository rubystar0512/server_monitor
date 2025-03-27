const WebSocket = require("ws");
const si = require("systeminformation");
const express = require("express");
const cors = require("cors");

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Store connected clients
const clients = new Set();

// Broadcast data to all connected clients
function broadcast(data) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Collect system information
async function collectSystemInfo() {
  try {
    const [cpu, mem, net, disk, temp, os] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.fsSize(),
      si.cpuTemperature(),
      si.osInfo(),
    ]);

    return {
      timestamp: Date.now(),
      os: {
        platform: os.platform,
        distro: os.distro,
        release: os.release,
      },
      cpu: {
        load: cpu.currentLoad.toFixed(2),
        cores: cpu.cpus.map((core) => ({
          load: core.load.toFixed(2),
        })),
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usedPercent: ((mem.used / mem.total) * 100).toFixed(2),
      },
      network: {
        download: (net[0].rx_sec / 1024 / 1024).toFixed(2), // Convert to MB/s
        upload: (net[0].tx_sec / 1024 / 1024).toFixed(2), // Convert to MB/s
      },
      storage: disk.map((d) => ({
        drive: d.mount,
        size: d.size,
        used: d.used,
        usedPercent: ((d.used / d.size) * 100).toFixed(2),
      })),
      temperature: temp.main ? temp.main.toFixed(2) : "N/A",
    };
  } catch (error) {
    console.error("Error collecting system info:", error);
    return null;
  }
}

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  console.log(`New client connected from ${req.socket.remoteAddress}`);
  clients.add(ws);

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Start monitoring loop
let monitoringInterval;

function startMonitoring() {
  monitoringInterval = setInterval(async () => {
    const data = await collectSystemInfo();
    if (data) {
      broadcast(data);
    }
  }, 1000);
}

// Start server
server.listen(PORT, () => {
  console.log(`Monitoring service running on port ${PORT}`);
  startMonitoring();
});

// Cleanup on exit
process.on("SIGTERM", () => {
  clearInterval(monitoringInterval);
  server.close();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
