import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Card as MUICard, CardContent, Typography, Box, Stack, Chip, CircularProgress } from "@mui/material";

// Helper functions (unchanged)
const groupTasksByWeek = (tasks) => {
  const groupedTasks = {};

  tasks.forEach((task) => {
    if (!task.interviewDate) {
      // console.warn("Task missing interviewDate:", task);
      return; // Skip tasks without interviewDate
    }

    const date = new Date(task.interviewDate); // Use interviewDate
    const weekNumber = getWeekNumber(date);

    if (!groupedTasks[weekNumber]) {
      groupedTasks[weekNumber] = [];
    }

    groupedTasks[weekNumber].push(task);
  });

  return groupedTasks;
};

const getWeekNumber = (date) => {
  const startDate = new Date("2025-01-05"); // Week 1 starts on 5th January 2025
  const timeDifference = date - startDate;
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
  return Math.floor(daysDifference / 7) + 1; // Calculate week number
};

const countReasonsAndCategories = (tasks) => {
  const reasons = {};
  const categories = {
    detractor: 0,
    neutral: 0,
    promoter: 0,
  };

  tasks.forEach((task) => {
    if (!task.reason) {
      // console.warn("Task missing reason:", task);
      return; // Skip tasks without reason
    }

    // Count reasons
    if (!reasons[task.reason]) {
      reasons[task.reason] = 0;
    }
    reasons[task.reason]++;

    // Categorize tasks based on evaluationScore
    if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
      categories.detractor++;
    } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
      categories.neutral++;
    } else if (task.evaluationScore >= 9 && task.evaluationScore <= 10) {
      categories.promoter++;
    }
  });

  return { reasons, categories };
};

const compareReasons = (currentReasons, previousReasons) => {
  const comparison = {};

  Object.keys(currentReasons).forEach((reason) => {
    const currentCount = currentReasons[reason];
    const previousCount = previousReasons[reason] || 0;
    comparison[reason] = currentCount - previousCount;
  });

  return comparison;
};

const calculateReasonTrends = (groupedTasks) => {
  const weeks = Object.keys(groupedTasks).sort((a, b) => a - b);
  const trends = [];

  weeks.forEach((week, index) => {
    const currentWeekTasks = groupedTasks[week];
    const previousWeekTasks = groupedTasks[weeks[index - 1]] || [];

    const { reasons: currentWeekReasons, categories: currentWeekCategories } =
      countReasonsAndCategories(currentWeekTasks);
    const { reasons: previousWeekReasons } = countReasonsAndCategories(previousWeekTasks);

    const trend = {
      week,
      totalTasks: currentWeekTasks.length, // Total tasks for the week
      reasons: currentWeekReasons,
      categories: currentWeekCategories, // Detractor, Neutral, Promoter counts
      comparison: index === 0 ? null : compareReasons(currentWeekReasons, previousWeekReasons), // No comparison for the first week
    };

    trends.push(trend);
  });

  return trends;
};

// Card component to display weekly trends
const Card = ({ trend }) => {
  if (!trend) {
    return (
      <MUICard
        sx={{
          minWidth: 400,
          boxShadow: 1,
          background: "#1e1e1e",
          color: "#e0e0e0",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ color: "#b0b0b0" }}>
            No Data Available
          </Typography>
        </CardContent>
      </MUICard>
    );
  }

  const { week, totalTasks, reasons, categories, comparison } = trend;

  const getWeekDateRange = (week) => {
    const startDate = new Date(2025, 0, 5); // January 5, 2025 (month is 0-indexed)
    const startOfWeek = new Date(startDate.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

    const formatDate = (date) =>
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  // Sort reasons in descending order based on their counts
  const sortedReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1]);

  // Settings for the card slider
  const cardSliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <MUICard
      sx={{
        boxShadow: 1,
        background: "#1e1e1e",
        color: "#e0e0e0",
        mx: '4px',
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <CardContent sx={{
        padding: '30px'
      }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Chip
            label={`Week ${week}`}
            sx={{ mb: 2, backgroundColor: "#ffffff29", color: "#e0e0e0" }}
          />
          <Typography variant="body1" sx={{ color: "#9e9e9e", mb: 2, fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>
            {getWeekDateRange(week)}
          </Typography>
        </Stack>
        <Stack direction={'row'} gap={3}>
          <Typography variant="body1" sx={{ color: "#9e9e9e", mb: 2, fontFamily: 'IBM Plex Mono', fontSize: '13px', fontWeight: 'bold' }}>
            Total Tasks: {totalTasks}
          </Typography>
          <Typography variant="body1" sx={{ color: "#9e9e9e", mb: 2, fontFamily: 'IBM Plex Mono', fontSize: '13px', fontWeight: 'bold' }}>
            Detractors: {categories.detractor}
          </Typography>
          <Typography variant="body1" sx={{ color: "#9e9e9e", mb: 2, fontFamily: 'IBM Plex Mono', fontSize: '13px', fontWeight: 'bold' }}>
            Neutrals: {categories.neutral}
          </Typography>
        </Stack>

        {/* Slider for reasons */}
        <Slider {...cardSliderSettings}>
          {sortedReasons.map(([reason, count]) => (
            <div key={reason} style={{ padding: "0 8px" }}>
              <Box
                sx={{
                  border: "1px solid #333",
                  borderRadius: "4px",
                  padding: "8px",
                  backgroundColor: "#2a2a2a",
                }}
              >
                <Typography variant="body1" sx={{ color: "#e0e0e0" }}>
                  {reason}: {count}
                </Typography>
                {comparison !== null && comparison[reason] !== undefined && (
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        comparison[reason] > 0
                          ? "#F44336" // Red for increase (issue)
                          : comparison[reason] < 0
                            ? "#4CAF50" // Green for decrease (improvement)
                            : "#b0b0b0", // Gray for no change
                    }}
                  >
                    {comparison[reason] >= 0 ? "+" : ""}
                    {comparison[reason]} compared to last week
                  </Typography>
                )}
              </Box>
            </div>
          ))}
        </Slider>
      </CardContent>
    </MUICard>
  );
};

// Slider component to navigate through weeks
const WeekSlider = ({ trends }) => {
  const settings = {
    // infinite: true,
    dots: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    rows: 1,
    focusOnSelect: true,
  };

  if (!trends || trends.length === 0) {
    return (
      <MUICard
        sx={{
          boxShadow: 1,
          background: "#1e1e1e",
          color: "#e0e0e0",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ color: "#b0b0b0" }}>
            No Trends Available
          </Typography>
        </CardContent>
      </MUICard>
    );
  }

  return (
    <div style={{ height: "300px", padding: "0" }}>
      <Slider {...settings}>
        {trends.map((trend, index) => (
          <div key={index}>
            <Card trend={trend} />
          </div>
        ))}
      </Slider>
    </div>
  );
};

// Main component to group tasks, calculate trends, and render the slider
const WeeklyTrends = ({ tasks }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <MUICard
        sx={{
          minWidth: 200,
          boxShadow: 1,
          background: "#1e1e1e",
          color: "#e0e0e0",
        }}
      >
        <CardContent
          sx={{
            padding: '30px'
          }}
        >
          <Typography variant="h6" sx={{ color: "#b0b0b0" }}>
            <CircularProgress size={24} />
          </Typography>
        </CardContent>
      </MUICard>
    );
  }

  const groupedTasks = groupTasksByWeek(tasks);
  const trends = calculateReasonTrends(groupedTasks);

  return <WeekSlider trends={trends} />;
};

const ReasonTrend = ({ tasks }) => {
  return (
    <div style={{ padding: "8px 0 0", backgroundColor: "#121212" }}>
      <WeeklyTrends tasks={tasks} />
    </div>
  );
};

export default ReasonTrend;