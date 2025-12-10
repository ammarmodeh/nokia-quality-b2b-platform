import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import AIInsightButton from '../components/AIInsightButton';
import api from '../api/api';

// Example page demonstrating AI integration
const AIIntegrationExample = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setTasks(response.data);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };
    fetchTasks();
  }, []);

  // Example chart data
  const chartData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [{
      label: 'Tasks by Priority',
      data: [
        tasks.filter(t => t.priority === 'High').length,
        tasks.filter(t => t.priority === 'Medium').length,
        tasks.filter(t => t.priority === 'Low').length,
      ],
      backgroundColor: ['#f44336', '#ff9800', '#4caf50'],
    }]
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#2d2d2d', minHeight: '100vh', color: '#ffffff' }}>
      <Typography variant="h4" sx={{ mb: 4, color: '#90caf9' }}>
        AI Integration Example
      </Typography>

      {/* Example 1: Chart with AI Button */}
      <Paper sx={{ p: 3, mb: 4, backgroundColor: '#2d2d2d' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Tasks by Priority
          </Typography>
          <AIInsightButton
            data={chartData}
            chartType="bar-chart"
            title="Tasks by Priority Distribution"
            context="This chart shows the distribution of tasks across different priority levels"
          />
        </Box>
        <Box sx={{ height: 300 }}>
          <Bar data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: '#ffffff' } } }, scales: { y: { ticks: { color: '#ffffff' } }, x: { ticks: { color: '#ffffff' } } } }} />
        </Box>
      </Paper>

      {/* Example 2: Table with AI Button */}
      <Paper sx={{ p: 3, backgroundColor: '#2d2d2d' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Recent Tasks
          </Typography>
          <AIInsightButton
            data={tasks.slice(0, 10)}
            chartType="table"
            title="Recent Tasks Overview"
            context="This table shows the 10 most recent tasks in the system"
          />
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#90caf9' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#90caf9' }}>Priority</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#90caf9' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 10).map((task, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>{task.title}</td>
                  <td style={{ padding: '12px' }}>{task.priority}</td>
                  <td style={{ padding: '12px' }}>{task.validationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: '#2d2d2d', border: '1px solid #3f51b5' }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#90caf9' }}>
          How to Add AI to Your Pages
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
          Simply import the AIInsightButton and add it next to any chart or table:
        </Typography>
        <Box sx={{ p: 2, backgroundColor: '#252525', borderRadius: 1, fontFamily: 'monospace', fontSize: '12px' }}>
          {`import AIInsightButton from '../components/AIInsightButton';

<AIInsightButton 
  data={yourData} 
  chartType="bar-chart"
  title="Your Chart Title"
  context="Description of what this data represents"
/>`}
        </Box>
      </Paper>
    </Box>
  );
};

export default AIIntegrationExample;
