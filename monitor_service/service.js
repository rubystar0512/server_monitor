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
async function collectDetailedSystemInfo() {
  try {
    const [cpu, mem, net, disk, temp, os, processes, diskIO] =
      await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats(),
        si.fsSize(),
        si.cpuTemperature(),
        si.osInfo(),
        si.processes(),
        si.disksIO(),
      ]);

    return {
      timestamp: Date.now(),
      os: {
        platform: os.platform,
        distro: os.distro,
        release: os.release,
        kernel: os.kernel,
        arch: os.arch,
      },
      cpu: {
        load: {
          current: cpu.currentLoad.toFixed(2),
          user: cpu.currentLoadUser.toFixed(2),
          system: cpu.currentLoadSystem.toFixed(2),
          idle: cpu.currentLoadIdle.toFixed(2),
        },
        cores: cpu.cpus.map((core) => ({
          load: core.load.toFixed(2),
          loadUser: core.loadUser.toFixed(2),
          loadSystem: core.loadSystem.toFixed(2),
        })),
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        active: mem.active,
        available: mem.available,
        swap: {
          total: mem.swaptotal,
          used: mem.swapused,
          free: mem.swapfree,
        },
        usedPercent: ((mem.used / mem.total) * 100).toFixed(2),
      },
      network: net.map((interface) => ({
        interface: interface.iface,
        state: interface.operstate,
        rx: {
          bytes: interface.rx_bytes,
          dropped: interface.rx_dropped,
          errors: interface.rx_errors,
          sec: (interface.rx_sec / 1024 / 1024).toFixed(2), // MB/s
        },
        tx: {
          bytes: interface.tx_bytes,
          dropped: interface.tx_dropped,
          errors: interface.tx_errors,
          sec: (interface.tx_sec / 1024 / 1024).toFixed(2), // MB/s
        },
      })),
      storage: {
        drives: disk.map((d) => ({
          filesystem: d.fs,
          type: d.type,
          mount: d.mount,
          size: d.size,
          used: d.used,
          available: d.available,
          usedPercent: ((d.used / d.size) * 100).toFixed(2),
        })),
        io: {
          readIO: diskIO?.rIO,
          writeIO: diskIO?.wIO,
          readIO_sec: diskIO?.rIO_sec,
          writeIO_sec: diskIO?.wIO_sec,
        },
      },
      processes: {
        all: processes.all,
        running: processes.running,
        blocked: processes.blocked,
        sleeping: processes.sleeping,
        list: processes.list.slice(0, 10).map((p) => ({
          // Top 10 processes
          pid: p.pid,
          name: p.name,
          cpu: p.cpu,
          mem: p.mem,
          priority: p.priority,
          state: p.state,
        })),
      },
      temperature: {
        main: temp.main ? temp.main.toFixed(2) : "N/A",
        cores: temp.cores ? temp.cores.map((t) => t.toFixed(2)) : [],
        max: temp.max ? temp.max.toFixed(2) : "N/A",
      },
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
    const data = await collectDetailedSystemInfo();
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
