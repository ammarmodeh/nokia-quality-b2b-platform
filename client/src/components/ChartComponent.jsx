import { Box, Typography } from "@mui/material";
import { Line } from "react-chartjs-2";
import ChartDataLabels from 'chartjs-plugin-datalabels';

export const ChartComponent = ({ chartData }) => {
  if (!chartData || !chartData.datasets) {
    return null;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e0e0e0",
          usePointStyle: true,
          padding: 15,
          font: { size: 12, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: "rgba(30, 30, 30, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#e0e0e0",
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value}%`;
          }
        }
      },
      datalabels: {
        display: true,
        color: "#ffffff",
        align: "top",
        offset: 6,
        font: { weight: "bold", size: 10 },
        formatter: (value) => `${value}%`,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        min: -20,
        max: 100,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          callback: (value) => `${value}%`
        }
      },
    },
    elements: {
      line: { tension: 0.3, borderWidth: 2.5 },
      point: { radius: 5, hoverRadius: 7, borderWidth: 2, backgroundColor: "#1e1e1e" }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ bgcolor: '#1e1e1e', p: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
        <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          NPS Performance Trends
        </Typography>
        <Box sx={{ height: 450 }}>
          <Line data={chartData} options={options} plugins={[ChartDataLabels]} />
        </Box>
      </Box>
    </Box>
  );
};
