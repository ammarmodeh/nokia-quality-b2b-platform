import { useRef } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { Line } from "react-chartjs-2";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MdPhotoCamera } from "react-icons/md";

export const ChartComponent = ({ chartData }) => {
  const chartRef = useRef(null);

  if (!chartData || !chartData.datasets) {
    return null;
  }

  const handleCapture = () => {
    if (chartRef.current) {
      const base64Image = chartRef.current.toBase64Image();
      const link = document.createElement("a");
      link.href = base64Image;
      link.download = `NPS_Performance_Trends_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    }
  };

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
        display: (context) => context.dataset.datalabels?.display !== false,
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

  // Plugin to draw background color on canvas (needed for snapshot/export)
  const backgroundPlugin = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart, args, options) => {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = options.color || '#1e1e1e';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ bgcolor: '#1e1e1e', p: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            NPS Performance Trends
          </Typography>
          <Tooltip title="Capture Chart as Image">
            <IconButton
              onClick={handleCapture}
              size="small"
              sx={{
                color: '#7b68ee',
                backgroundColor: 'rgba(123, 104, 238, 0.05)',
                '&:hover': {
                  backgroundColor: 'rgba(123, 104, 238, 0.15)',
                  color: '#9c8dff'
                }
              }}
            >
              <MdPhotoCamera size={20} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ height: 450 }}>
          <Line
            ref={chartRef}
            data={chartData}
            options={{
              ...options,
              plugins: {
                ...options.plugins,
                customCanvasBackgroundColor: {
                  color: '#1e1e1e',
                }
              }
            }}
            plugins={[ChartDataLabels, backgroundPlugin]}
          />
        </Box>
      </Box>
    </Box>
  );
};
