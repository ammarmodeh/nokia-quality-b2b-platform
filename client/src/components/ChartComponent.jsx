import { Button } from "@mui/material";
import { useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const ChartComponent = ({ chartData }) => {
  const [chartType, setChartType] = useState("bar"); // Default to 'bar'

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e0e0e0" // Light color for legend text
        }
      },
      // title: {
      //   display: true,
      //   text: "Tasks Data Bar Chart with Violations Trend Line",
      //   color: "#e0e0e0" // Light color for title
      // },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const data = chartData.datasets.map((dataset) => {
              const value = dataset.data[tooltipItem.dataIndex];
              return `${dataset.label}: ${value}`;
            });
            return data;
          },
        },
        backgroundColor: "rgba(30, 30, 30, 0.9)",
        titlecolor: "#ffffff",
        bodyColor: "#e0e0e0"
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)"
        },
        ticks: {
          color: "#e0e0e0"
        }
      },
      y: {
        beginAtZero: true,
        max: Math.max(...chartData.datasets.flatMap(dataset => dataset.data)) + 10,
        grid: {
          color: "rgba(255, 255, 255, 0.1)"
        },
        ticks: {
          color: "#e0e0e0"
        }
      },
    },
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2
      },
      point: {
        radius: 3,
        hoverRadius: 5
      }
    }
  };

  // Prepare datasets with specific colors for line chart
  const prepareDatasets = () => {
    return chartData.datasets.map(dataset => {
      // For line chart, apply specific colors
      if (chartType === "line") {
        if (dataset.label === "Detractor") {
          return {
            ...dataset,
            type: 'line',
            borderColor: 'rgba(255, 99, 132, 1)', // Red for Detractor
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointBordercolor: '#ffffff',
            borderWidth: 2,
            fill: false
          };
        } else if (dataset.label === "NeutralPassive") {
          return {
            ...dataset,
            type: 'line',
            borderColor: 'rgba(255, 159, 64, 1)', // Orange for Neutral
            backgroundColor: 'rgba(255, 159, 64, 0.5)',
            pointBackgroundColor: 'rgba(255, 159, 64, 1)',
            pointBordercolor: '#ffffff',
            borderWidth: 2,
            fill: false
          };
        } else if (dataset.label === "Violations") {
          return {
            ...dataset,
            type: 'line',
            borderColor: 'rgba(75, 192, 192, 1)', // Keep existing color for Violations
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
            pointBordercolor: '#ffffff',
            borderWidth: 2,
            fill: false
          };
        }
      }
      // For bar chart, use original colors
      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || 'rgba(53, 162, 235, 0.5)',
        borderColor: dataset.borderColor || 'rgba(53, 162, 235, 1)',
        borderWidth: 1
      };
    });
  };

  // Add the line dataset for violations trend (only if in bar chart mode)
  const updatedChartData = {
    ...chartData,
    datasets: chartType === "bar"
      ? [...prepareDatasets(), {
        label: "Violations Trend",
        data: chartData.datasets.find(dataset => dataset.label === "Violations")?.data || [],
        type: 'line',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        fill: false,
        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
        pointBordercolor: '#ffffff',
      }]
      : prepareDatasets()
  };

  // Handle chart type toggle
  const toggleChartType = () => {
    setChartType((prevType) => (prevType === "bar" ? "line" : "bar"));
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "start",
      gap: "20px",
      marginTop: "20px",
      // backgroundColor: "#2d2d2d",
      padding: "20px",
      borderRadius: "8px"
    }}>
      <Button
        onClick={toggleChartType}
        variant="contained"
        color="primary"
        sx={{
          fontWeight: "bold",
          textTransform: "none",
          backgroundColor: "#1d4ed8",
          "&:hover": {
            backgroundColor: "#1e40af"
          }
        }}
      >
        Switch to {chartType === "bar" ? "Line" : "Bar"} Chart
      </Button>

      <div style={{ width: "100%", height: "400px" }}>
        {chartType === "bar" ? (
          <Bar data={updatedChartData} options={options} />
        ) : (
          <Line data={updatedChartData} options={options} />
        )}
      </div>
    </div>
  );
};