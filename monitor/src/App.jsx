import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  Typography,
  CircularProgress,
  Chip,
  useTheme,
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Memory,
  Storage,
  Speed,
  NetworkCheck,
  Menu as MenuIcon,
  Computer,
  DeviceThermostat,
  Apps,
} from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import websocketService from "./websocket";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#f48fb1",
    },
    background: {
      default: "#0a1929",
      paper: "#0d2137",
    },
  },
});

const MAX_DATA_POINTS = 30;

const StatCard = ({ title, value, icon, color }) => {
  const theme = useTheme();
  return (
    <Card sx={{ p: 2, height: "100%" }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Box
          sx={{
            backgroundColor: `${color}22`,
            p: 1,
            borderRadius: 1,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" color="textSecondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4">{value}</Typography>
    </Card>
  );
};

const LineChart = ({ title, data, labels, color }) => {
  const chartOptions = {
    responsive: true,
    animation: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data,
        borderColor: color,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  return (
    <Card sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Line options={chartOptions} data={chartData} height={100} />
    </Card>
  );
};

const ProcessList = ({ processes }) => (
  <Card sx={{ p: 2, height: "100%" }}>
    <Typography variant="h6" gutterBottom>
      Top Processes
    </Typography>
    <Box sx={{ maxHeight: 400, overflow: "auto" }}>
      {processes?.map((process) => (
        <Box
          key={process.pid}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            p: 1,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Typography>{process.name}</Typography>
          <Chip
            size="small"
            label={`CPU: ${process.cpu}% | MEM: ${process.mem}%`}
          />
        </Box>
      ))}
    </Box>
  </Card>
);

const SystemMonitor = () => {
  const [systemData, setSystemData] = useState({
    cpu: { load: { current: 0 }, cores: [] },
    memory: { usedPercent: 0, total: 0, used: 0 },
    network: [],
    storage: { drives: [], io: {} },
    processes: { list: [] },
    temperature: { main: "N/A" },
    os: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeLabels] = useState(Array(MAX_DATA_POINTS).fill(""));
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);

  useEffect(() => {
    websocketService.connect();

    const unsubscribe = websocketService.addListener((data) => {
      setIsConnected(true);
      setSystemData(data);
      setCpuHistory((prev) => [
        ...prev.slice(-MAX_DATA_POINTS + 1),
        parseFloat(data.cpu.load.current),
      ]);
      setMemoryHistory((prev) => [
        ...prev.slice(-MAX_DATA_POINTS + 1),
        parseFloat(data.memory.usedPercent),
      ]);
    });

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, []);

  if (!isConnected) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
        <Typography ml={2}>Connecting to monitoring service...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2 }}>
            System Monitor
          </Typography>
          <Chip
            label={`${systemData.os?.distro} ${systemData.os?.release}`}
            sx={{ ml: "auto" }}
          />
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <List sx={{ width: 250 }}>
          {[
            { text: "Overview", icon: <Apps /> },
            { text: "CPU", icon: <Speed /> },
            { text: "Memory", icon: <Memory /> },
            { text: "Storage", icon: <Storage /> },
            { text: "Network", icon: <NetworkCheck /> },
            { text: "System", icon: <Computer /> },
          ].map((item) => (
            <ListItem button key={item.text}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Grid container spacing={3}>
          {/* Quick Stats */}
          <Grid item xs={12} md={3}>
            <StatCard
              title="CPU Load"
              value={`${systemData.cpu.load.current}%`}
              icon={<Speed color="primary" />}
              color="#90caf9"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Memory Usage"
              value={`${systemData.memory.usedPercent}%`}
              icon={<Memory color="secondary" />}
              color="#f48fb1"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Temperature"
              value={`${systemData.temperature.main}°C`}
              icon={<DeviceThermostat sx={{ color: "#4caf50" }} />}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              title="Processes"
              value={systemData.processes.all}
              icon={<Apps sx={{ color: "#ff9800" }} />}
              color="#ff9800"
            />
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={6}>
            <LineChart
              title="CPU Usage History"
              data={cpuHistory}
              labels={timeLabels}
              color="#90caf9"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <LineChart
              title="Memory Usage History"
              data={memoryHistory}
              labels={timeLabels}
              color="#f48fb1"
            />
          </Grid>

          {/* Storage and Processes */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Storage Usage
              </Typography>
              {systemData.storage.drives.map((drive, index) => (
                <Box key={index} my={1}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {drive.mount} ({drive.filesystem})
                    </Typography>
                    <Typography variant="body2">
                      {drive.usedPercent}% used
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: "100%",
                      height: 4,
                      bgcolor: "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: `${drive.usedPercent}%`,
                        height: "100%",
                        bgcolor: "primary.main",
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <ProcessList processes={systemData.processes.list} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SystemMonitor />
    </ThemeProvider>
  );
};

export default App;
