import React, { useState, useEffect } from "react";
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
import { Line } from "react-chartjs-2";
import { Box, Card, Typography, Grid, CircularProgress } from "@mui/material";
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

const MAX_DATA_POINTS = 30;

const SystemMonitor = () => {
  const [systemData, setSystemData] = useState({
    cpu: [],
    memory: [],
    network: { download: [], upload: [] },
    storage: [],
    temperature: [],
    os: null,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    websocketService.connect();

    const unsubscribe = websocketService.addListener((data) => {
      setIsConnected(true);
      setSystemData((prev) => ({
        cpu: [...prev.cpu.slice(-MAX_DATA_POINTS), data.cpu.load],
        memory: [
          ...prev.memory.slice(-MAX_DATA_POINTS),
          data.memory.usedPercent,
        ],
        network: {
          download: [
            ...prev.network.download.slice(-MAX_DATA_POINTS),
            data.network.download,
          ],
          upload: [
            ...prev.network.upload.slice(-MAX_DATA_POINTS),
            data.network.upload,
          ],
        },
        storage: data.storage,
        temperature: [
          ...prev.temperature.slice(-MAX_DATA_POINTS),
          data.temperature,
        ],
        os: data.os,
      }));
    });

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, []);

  const chartOptions = {
    responsive: true,
    animation: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
    plugins: {
      legend: {
        position: "top",
      },
    },
  };

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
    <Box p={3}>
      {systemData.os && (
        <Typography variant="h6" gutterBottom>
          {`${systemData.os.distro} (${systemData.os.platform} ${systemData.os.release})`}
        </Typography>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <Box p={2}>
              <Typography variant="h6">CPU Usage (%)</Typography>
              <Line
                data={{
                  labels: Array(systemData.cpu.length).fill(""),
                  datasets: [
                    {
                      label: "CPU",
                      data: systemData.cpu,
                      borderColor: "rgb(75, 192, 192)",
                      tension: 0.1,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <Box p={2}>
              <Typography variant="h6">Memory Usage (%)</Typography>
              <Line
                data={{
                  labels: Array(systemData.memory.length).fill(""),
                  datasets: [
                    {
                      label: "Memory",
                      data: systemData.memory,
                      borderColor: "rgb(255, 99, 132)",
                      tension: 0.1,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <Box p={2}>
              <Typography variant="h6">Network Usage (MB/s)</Typography>
              <Line
                data={{
                  labels: Array(systemData.network.download.length).fill(""),
                  datasets: [
                    {
                      label: "Download",
                      data: systemData.network.download,
                      borderColor: "rgb(54, 162, 235)",
                      tension: 0.1,
                    },
                    {
                      label: "Upload",
                      data: systemData.network.upload,
                      borderColor: "rgb(255, 159, 64)",
                      tension: 0.1,
                    },
                  ],
                }}
                options={{
                  ...chartOptions,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <Box p={2}>
              <Typography variant="h6">Storage Usage</Typography>
              {systemData.storage.map((drive, index) => (
                <Box key={index} my={1}>
                  <Typography variant="body2">
                    {`${drive.drive}: ${drive.usedPercent}% used`}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMonitor;
