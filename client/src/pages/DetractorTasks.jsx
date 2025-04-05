import { useState, useEffect, useRef, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";
import { FaList } from "react-icons/fa";
import { MdClose, MdGridView, MdOutlineSearch } from "react-icons/md";
import { Tabs, Tab, Stack, Typography, TextField, IconButton, Box, Button, CircularProgress, useMediaQuery } from "@mui/material";
import { HourglassEmpty, PlayCircle, CheckCircle } from "@mui/icons-material";
import AddTask from "../components/task/AddTask";
import api from "../api/api";
import { PulseLoader } from "react-spinners";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import TaskCard from "../components/TaskCard";
import { useSelector } from "react-redux";

const TABS = [
  { title: "Board View", icon: <MdGridView /> },
  { title: "List View", icon: <FaList /> },
];

const DetractorTasks = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(false);
  const [updateStateDuringSave, setUpdateStateDuringSave] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allTasks, setAllTasks] = useState([]);
  const searchInputRef = useRef(null);
  const { ref, inView } = useInView();

  const isSmallScreen = useMediaQuery('(max-width:600px)');
  const isMediumScreen = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users/get-all-users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const { data } = await api.get("/tasks/get-detractor-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        const filteredTasks = data.filter((task) => task.evaluationScore >= 1 && task.evaluationScore <= 6);
        setAllTasks(filteredTasks);
      } catch (error) {
        console.error("Error fetching all tasks:", error);
      }
    };
    fetchAllTasks();
  }, [updateStateDuringSave, updateRefetchTasks]);

  const TASKS_PER_PAGE = 5;

  const fetchTasks = async ({ pageParam = 1 }) => {
    try {
      const { data } = await api.get(`/tasks/get-paginated-detractor-tasks?page=${pageParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data.filter((task) => task.evaluationScore >= 1 && task.evaluationScore <= 6);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  };

  const { data, status, error, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['detractor-tasks'],
    queryFn: fetchTasks,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < TASKS_PER_PAGE) {
        return undefined;
      }
      return allPages.length + 1;
    }
  });

  useEffect(() => {
    if (inView && hasNextPage && !searchTerm) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, searchTerm]);

  const tasks = useMemo(() => (data ? data.pages.flat() : []), [data]);

  useEffect(() => {
    if (tasks.length > 0 && !searchTerm) {
      setFilteredTasks(tasks);
    }
  }, [tasks, searchTerm]);

  const calculateStatusStats = () => {
    const totalTasks = allTasks.length;
    if (totalTasks === 0) return { todo: { count: 0, percentage: 0 }, inProgress: { count: 0, percentage: 0 }, closed: { count: 0, percentage: 0 } };

    let todo = 0, inProgress = 0, closed = 0;
    allTasks.forEach(task => {
      const totalProgress = task.subTasks.reduce((sum, subtask) => sum + subtask.progress, 0);
      if (totalProgress === 0) todo++;
      else if (totalProgress === 100) closed++;
      else inProgress++;
    });

    return {
      todo: { count: todo, percentage: (todo / totalTasks) * 100 },
      inProgress: { count: inProgress, percentage: (inProgress / totalTasks) * 100 },
      closed: { count: closed, percentage: (closed / totalTasks) * 100 },
    };
  };

  const statusStats = calculateStatusStats();

  const handleSearchClick = () => {
    const term = searchInputRef.current.value.trim().toLowerCase();
    setSearchTerm(term);
    if (term === "") {
      setFilteredTasks(allTasks);
    } else {
      const filtered = allTasks.filter((task) =>
        task.slid.toLowerCase().includes(term)
      );
      setFilteredTasks(filtered);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    searchInputRef.current.value = "";
    setFilteredTasks(tasks);
  };

  if (status === "pending") {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography variant="h6" color="error" gutterBottom>
          Oops! Something went wrong.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {error.message}
        </Typography>
        <Button variant="contained" color="primary" onClick={() => fetchNextPage()}>
          Retry
        </Button>
      </Box>
    );
  }

  const handleTaskUpdate = (updatedTask) => {
    setFilteredTasks((prevTasks) =>
      prevTasks.map((task) => (task._id === updatedTask._id ? updatedTask : task))
    );
  };

  const handleTaskDelete = async (taskId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;

    try {
      const { data } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (data) {
        const response = await api.post(`/trash/add-trash`, data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        if (response.status === 200) {
          alert("Task added to trash successfully! You can check the trash page.");
          const res = await api.delete(`/tasks/delete-task/${taskId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          });
          // console.log(res.data);
          setFilteredTasks((prevTasks) => prevTasks.filter((task) => task._id !== taskId));
        }
      } else {
        alert("Failed to add task to trash.");
      }
    } catch (error) {
      console.error("Error Adding task to trash:", error);
    }
  };

  const handleTaskArchive = async (taskId) => {
    const confirmDelete = window.confirm("Are you sure you want to archive this task?");
    if (!confirmDelete) return;

    try {
      const { data } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (data) {
        const response = await api.post(`/archive/add-archive`, data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        if (response.status === 200) {
          alert("Task added to archive successfully! You can check the archive page.");
          const res = await api.delete(`/tasks/delete-task/${taskId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          });
          // console.log(res.data);
          setFilteredTasks((prevTasks) => prevTasks.filter((task) => task._id !== taskId));
        }
      } else {
        alert("Failed to add task to archive.");
      }
    } catch (error) {
      console.error("Error Adding task to archive:", error);
    }
  };

  const handleFavoriteClick = async (task) => {
    try {
      const response = await api.post("/favourites/add-favourite", {
        task,
        userId: user._id,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (response.status === 201) {
        alert("Task added to favorites successfully!");
      } else if (response.data?.isAlreadyFavorited) {
        alert("This task is already in your favorites list!");
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.isAlreadyFavorited) {
        alert("This task is already in your favorites list!");
      } else {
        console.error("Error updating favorite status:", error);
        alert("Failed to add to favorites. Please try again.");
      }
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelected(newValue);
  };

  return (
    <Box sx={{ padding: isSmallScreen ? 1 : 2 }}>
      <Typography variant="h5" sx={{ fontWeight: "bold", color: "#727272", fontSize: isSmallScreen ? '1rem' : '1.5rem', mb: 2 }} gutterBottom>
        All Tasks &gt; Detractors
      </Typography>
      <Stack
        direction={isSmallScreen ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isSmallScreen ? "flex-start" : "center"}
        spacing={isSmallScreen ? 2 : 0}
        sx={{ mb: 2 }}
      >
        <Tabs
          value={selected}
          onChange={handleTabChange}
          aria-label="task tabs"
          TabIndicatorProps={{
            style: {
              height: "2px",
              backgroundColor: "#2196f3",
            },
          }}
          variant={isSmallScreen ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{
            maxWidth: '100%',
            display: 'none' // This will hide the Tabs for all screen sizes
          }}
        >
          {TABS.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              disabled={index !== 0}
              label={isSmallScreen ? null : tab.title}
              iconPosition="start"
              sx={{ minWidth: 'unset', px: isSmallScreen ? 1 : 2 }}
            />
          ))}
        </Tabs>
        {user && user.role === "Admin" && (
          <Button
            sx={{
              gap: 1,
              ml: isSmallScreen ? 0 : 2,
              width: isSmallScreen ? '100%' : 'auto'
            }}
            variant="outlined"
            onClick={() => setOpen(true)}
          >
            <IoMdAdd size={20} className="text-lg text-[#1976D2]" />
            <Typography variant="caption" sx={{ fontWeight: "bold", fontSize: "15px" }} className="text-[#1976D2]">
              Create Task
            </Typography>
          </Button>
        )}
      </Stack>

      <Stack
        direction={isSmallScreen ? "column" : "row"}
        alignItems={isSmallScreen ? "flex-start" : "center"}
        justifyContent="space-between"
        spacing={isSmallScreen ? 2 : 0}
        sx={{ mb: 2 }}
      >
        <Box sx={{
          width: '100%',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          py: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                backgroundColor: "#fef9c2",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                color: "#d08700",
                fontSize: "12px",
                minWidth: 'max-content'
              }}
            >
              <HourglassEmpty sx={{ fontSize: "16px" }} />
              <Typography variant="caption" fontWeight="bold">
                {isSmallScreen ? (
                  `${statusStats.todo.count} (${statusStats.todo.percentage.toFixed(0)}%)`
                ) : (
                  `Todo (${statusStats.todo.count} | ${statusStats.todo.percentage.toFixed(0)}%)`
                )}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                backgroundColor: "#dbeafe",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                color: "#155dfc",
                fontSize: "12px",
                minWidth: 'max-content'
              }}
            >
              <PlayCircle sx={{ fontSize: "16px" }} />
              <Typography variant="caption" fontWeight="bold">
                {isSmallScreen ? (
                  `${statusStats.inProgress.count} (${statusStats.inProgress.percentage.toFixed(0)}%)`
                ) : (
                  `In Progress (${statusStats.inProgress.count} | ${statusStats.inProgress.percentage.toFixed(0)}%)`
                )}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                backgroundColor: "#dcfce7",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                color: "#00a63e",
                fontSize: "12px",
                minWidth: 'max-content'
              }}
            >
              <CheckCircle sx={{ fontSize: "16px" }} />
              <Typography variant="caption" fontWeight="bold">
                {isSmallScreen ? (
                  `${statusStats.closed.count} (${statusStats.closed.percentage.toFixed(0)}%)`
                ) : (
                  `Closed (${statusStats.closed.count} | ${statusStats.closed.percentage.toFixed(0)}%)`
                )}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: "600px",
            py: 1,
            px: 2,
            gap: 1,
            borderRadius: "999px",
            backgroundColor: "#121212",
            border: "1px solid #444",
            "&:focus-within": {
              borderColor: "#3ea6ff",
            },
          }}
        >
          <MdOutlineSearch className="text-gray-400 text-xl" />
          <TextField
            fullWidth
            variant="standard"
            placeholder="Search tasks by SLID..."
            inputRef={searchInputRef}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: "transparent",
                color: "#ffffff",
              },
              "& .MuiInputBase-input": {
                fontSize: "14px",
                color: "#ffffff",
                padding: 0,
              },
              "& .MuiInput-root:before": {
                borderBottom: "none",
              },
              "& .MuiInput-root:after": {
                borderBottom: "none",
              },
              "& .MuiInput-root:hover:not(.Mui-disabled):before": {
                borderBottom: "none",
              },
            }}
            InputProps={{
              disableUnderline: true,
              style: { color: "#ffffff" },
              endAdornment: searchTerm && (
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  sx={{ color: "#9e9e9e", "&:hover": { color: "#ffffff" } }}
                >
                  <MdClose className="text-xl" />
                </IconButton>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearchClick}
            size="small"
            sx={{
              backgroundColor: "#323232",
              color: "#ffffff",
              borderRadius: "999px",
              "&:hover": {
                backgroundColor: "#1d4ed8",
              },
              fontSize: "14px",
              textTransform: "none",
              px: 2,
              // display: isSmallScreen ? 'none' : 'inline-flex'
            }}
          >
            Search
          </Button>
        </Box>
      </Stack>

      {selected === 0 ? (
        <Box>
          {filteredTasks.length === 0 ? (
            <Typography align="center" color="textSecondary" sx={{ mt: 3, color: "antiquewhite" }}>
              No tasks found.
            </Typography>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: isSmallScreen ? '1fr' :
                    isMediumScreen ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 2,
                  mt: 3
                }}
              >
                {filteredTasks.map((task, index) => (
                  <TaskCard
                    key={`task-${task._id}-${index}`}
                    task={task}
                    users={users}
                    handleTaskUpdate={handleTaskUpdate}
                    handleTaskDelete={handleTaskDelete}
                    handleFavoriteClick={handleFavoriteClick}
                    handleTaskArchive={handleTaskArchive}
                    setUpdateStateDuringSave={setUpdateStateDuringSave}
                  />
                ))}
              </Box>
              <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }} ref={ref}>
                {isFetchingNextPage ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: "50px" }}>
                    <PulseLoader speedMultiplier={2} size={15} color="#e5e5e5" />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: "50px" }}></Box>
                )}
              </Box>
            </>
          )}
        </Box>
      ) : (
        <Box sx={{ width: '100%', textAlign: 'center', mt: 3 }}>
          <Typography variant="body1">
            Currently, the list view is not implemented
          </Typography>
        </Box>
      )}

      <AddTask open={open} setOpen={setOpen} setUpdateRefetchTasks={setUpdateRefetchTasks} />
    </Box>
  );
};

export default DetractorTasks;