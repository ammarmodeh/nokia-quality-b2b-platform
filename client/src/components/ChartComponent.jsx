import { useRef } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { Line } from "react-chartjs-2";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MdPhotoCamera, MdWbSunny, MdDarkMode } from "react-icons/md";

// Plugin to draw background color on canvas (moved outside for stability)
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

export const ChartComponent = ({ chartData }) => {
  const chartRef = useRef(null);

  if (!chartData || !chartData.datasets) {
    return null;
  }

  const handleCapture = (mode = 'dark') => {
    const chart = chartRef.current;
    if (!chart) return;

    // 1. Save original styles
    const originalOptions = {
      scales: {
        x: {
          grid: { color: chart.options.scales.x.grid.color },
          ticks: { color: chart.options.scales.x.ticks.color }
        },
        y: {
          grid: { color: chart.options.scales.y.grid.color },
          ticks: { color: chart.options.scales.y.ticks.color }
        }
      },
      plugins: {
        legend: { labels: { color: chart.options.plugins.legend.labels.color } },
        customCanvasBackgroundColor: { color: chart.options.plugins.customCanvasBackgroundColor.color }
      }
    };

    // Save original dataset colors (for datalabels)
    const originalDatasetColors = chart.data.datasets.map(d => ({
      datalabels: { ...d.datalabels }
    }));

    // 2. Apply Theme
    if (mode === 'light') {
      // Light Mode Styles
      chart.options.scales.x.grid.color = 'rgba(0, 0, 0, 0.05)';
      chart.options.scales.x.ticks.color = '#475569';
      chart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.05)';
      chart.options.scales.y.ticks.color = '#475569';
      chart.options.plugins.legend.labels.color = '#1e293b';
      chart.options.plugins.customCanvasBackgroundColor.color = '#ffffff';

      // Update datalabels for contrast (Dark text on light background)
      chart.data.datasets.forEach(dataset => {
        if (dataset.datalabels) {
          dataset.datalabels.color = '#1e293b'; // Dark text
          // Optional: Force background to be solid or different if needed
          // dataset.datalabels.backgroundColor = ...
        }
      });
    } else {
      // Dark Mode Styles (Ensure defaults are enforced)
      chart.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.05)';
      chart.options.scales.x.ticks.color = '#94a3b8';
      chart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
      chart.options.scales.y.ticks.color = '#94a3b8';
      chart.options.plugins.legend.labels.color = '#e0e0e0';
      chart.options.plugins.customCanvasBackgroundColor.color = '#1e1e1e';
    }

    // 3. Update & Capture (Synchronous update to ensure canvas is repainted)
    chart.update('none');
    const base64Image = chart.toBase64Image();

    // 4. Restore Originals
    chart.options.scales.x.grid.color = originalOptions.scales.x.grid.color;
    chart.options.scales.x.ticks.color = originalOptions.scales.x.ticks.color;
    chart.options.scales.y.grid.color = originalOptions.scales.y.grid.color;
    chart.options.scales.y.ticks.color = originalOptions.scales.y.ticks.color;
    chart.options.plugins.legend.labels.color = originalOptions.plugins.legend.labels.color;
    chart.options.plugins.customCanvasBackgroundColor.color = originalOptions.plugins.customCanvasBackgroundColor.color;

    chart.data.datasets.forEach((dataset, index) => {
      dataset.datalabels = originalDatasetColors[index].datalabels;
    });

    chart.update('none');

    // 5. Download
    const link = document.createElement("a");
    link.href = base64Image;
    link.download = `NPS_Trends_${mode}_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
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
      // Ensure customCanvasBackgroundColor options are accessible
      customCanvasBackgroundColor: {
        color: '#1e1e1e',
      }
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            NPS Performance Trends
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Capture Dark Mode">
              <IconButton
                onClick={() => handleCapture('dark')}
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
                <MdDarkMode size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Capture Light Mode">
              <IconButton
                onClick={() => handleCapture('light')}
                size="small"
                sx={{
                  color: '#f59e0b',
                  backgroundColor: 'rgba(245, 158, 11, 0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24'
                  }
                }}
              >
                <MdWbSunny size={20} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ height: 450 }}>
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            plugins={[ChartDataLabels, backgroundPlugin]}
          />
        </Box>
      </Box>
    </Box>
  );
};
