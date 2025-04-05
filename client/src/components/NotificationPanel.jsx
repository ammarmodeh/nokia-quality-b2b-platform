import { useEffect, useState, useMemo } from "react";
import { Menu, MenuItem, Button, Typography, Box, Badge, Stack } from "@mui/material";
import { BiSolidMessageRounded } from "react-icons/bi";
import { IoMdDocument, IoMdNotificationsOutline } from "react-icons/io";
import { IoMdClose } from "react-icons/io";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import api from "../api/api";

const NOTIFICATION_ICONS = {
  task: <IoMdNotificationsOutline className="h-5 w-5" />,
  suggestion: <BiSolidMessageRounded className="h-5 w-5" />,
  policy: <IoMdDocument className="h-5 w-5" />, // Add a document icon for policies
};

const NotificationPanel = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const markPolicyAsRead = async (policyId) => {
    try {
      const response = await api.patch(`/policies/${policyId}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to mark as read');
      }
      return true;
    } catch (error) {
      console.error('Mark policy as read failed:', error);
      // Optionally show error to user
      return false;
    }
  };

  const markPolicyResponseAsRead = async (policyId, logId) => {
    try {
      const response = await api.patch(
        `/policies/${policyId}/mark-response-read`,
        { logId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success) {
        console.error("Failed to mark response as read:", response.data.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error marking response as read:", error);
      return false;
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((item) => item._id !== id));
  };

  const markSuggestionAsRead = async (suggestionId) => {
    try {
      await api.patch(`/suggestions/${suggestionId}/mark-read`, null, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
    } catch (error) {
      console.error("Error marking suggestion as read:", error);
    }
  };

  const markResponseAsRead = async (suggestionId, responseId) => {
    try {
      await api.patch(`/suggestions/${suggestionId}/mark-response-read`, {
        responseId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
    } catch (error) {
      console.error("Error marking response as read:", error);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Fetch tasks assigned to me
        const tasksResponse = await api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        // Fetch user suggestions (only for regular users)
        const suggestionsResponse = user.role === "Member"
          ? await api.get("/suggestions/user", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          })
          : { data: { data: [] } };

        // Fetch admin suggestions (only for admin)
        const adminSuggestionsResponse = user.role === "Admin"
          ? await api.get("/suggestions", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          })
          : { data: { data: [] } };

        // Fetch policy notifications
        const policiesResponse = await api.get("/policies/notifications", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        // console.log({ policiesResponse });

        // Process tasks
        let taskNotifications = [];
        if (Array.isArray(tasksResponse.data)) {
          const myAssignedTasks = tasksResponse.data.filter((task) =>
            task.assignedTo.some((assignedUser) => assignedUser._id === user._id)
          );
          taskNotifications = myAssignedTasks
            .filter((task) => !task.readBy.includes(user._id))
            .map((task) => ({
              ...task,
              type: 'task',
              createdAt: task.createdAt,
              isRead: task.readBy.includes(user._id)
            }));
        }

        // Process policy notifications
        let policyNotifications = [];
        if (Array.isArray(policiesResponse.data?.data)) {
          policyNotifications = policiesResponse.data.data
            .flatMap(policy => {
              if (!policy.createdBy) return [];

              const createdById = policy.createdBy._id || policy.createdBy;
              const isAdmin = user.role === "Admin";
              const isManager = user.isManager;

              if (!isAdmin && !isManager) return [];

              // For admins: process all unread manager updates
              if (isAdmin && createdById === user._id) {
                return (policy.logs || [])
                  .filter(log => {
                    if (!log) return false;
                    const performedById = log.performedBy?._id || log.performedBy;
                    return log.action === 'update' &&
                      !(log.readBy || []).includes(user._id) &&
                      performedById !== user._id;
                  })
                  .map(log => ({
                    ...policy,
                    type: 'policy-response',
                    _id: `${policy._id}-${log._id}`,
                    logId: log._id,
                    createdAt: log.performedAt || policy.lastUpdate || policy.createdAt,
                    isRead: false,
                    lastAction: {
                      ...log,
                      performedBy: {
                        _id: log.performedBy?._id || log.performedBy,
                        name: log.performedBy?.name || 'Manager'
                      }
                    }
                  }));
              }
              // For managers: process unread policy creations
              else if (isManager && createdById !== user._id) {
                const hasReadPolicy = (policy.readBy || []).includes(user._id);
                return (policy.logs || [])
                  .filter(log => {
                    if (!log) return false;
                    return log.action === 'create' &&
                      !hasReadPolicy &&
                      (log.performedBy?._id || log.performedBy) !== user._id;
                  })
                  .map(log => ({
                    ...policy,
                    type: 'policy-admin',
                    _id: `${policy._id}-${log._id}`,
                    logId: log._id,
                    createdAt: log.performedAt || policy.createdAt,
                    isRead: false,
                    lastAction: {
                      ...log,
                      performedBy: {
                        _id: log.performedBy?._id || log.performedBy,
                        name: log.performedBy?.name || 'Admin'
                      }
                    }
                  }));
              }
              return [];
            })
            .filter(Boolean);
        }

        // Process user suggestions (create separate notifications for each unread response)
        let suggestionNotifications = [];
        if (Array.isArray(suggestionsResponse.data.data)) {
          suggestionNotifications = suggestionsResponse.data.data
            .filter(suggestion => suggestion.responseLog?.length > 0)
            .flatMap(suggestion => {
              return suggestion.responseLog
                .filter(response => !response.readBy?.includes(user._id))
                .map(response => ({
                  ...suggestion,
                  type: 'suggestion-response',
                  _id: `${suggestion._id}-${response._id}`,
                  responseId: response._id,
                  createdAt: response.respondedAt,
                  isRead: false,
                  lastResponse: response
                }));
            });
        }

        // Process admin suggestions (only unread ones)
        if (Array.isArray(adminSuggestionsResponse.data.data)) {
          const adminSuggestions = adminSuggestionsResponse.data.data
            .filter(suggestion => {
              if (!suggestion.readBy) return true;
              return !suggestion.readBy.includes(user._id);
            })
            .map(suggestion => ({
              ...suggestion,
              type: 'suggestion-admin',
              createdAt: suggestion.createdAt,
              isRead: suggestion.readBy?.includes(user._id) || false
            }));

          suggestionNotifications = [...suggestionNotifications, ...adminSuggestions];
        }

        // Combine and sort all notifications
        const allNotifications = [
          ...taskNotifications,
          ...suggestionNotifications,
          ...policyNotifications
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // After processing all notifications
        const unread = allNotifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        setNotifications(allNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const memoizedNotifications = useMemo(() => notifications, [notifications]);

  const handleViewNotification = async (notification) => {
    try {
      if (notification.type === 'task') {
        const response = await api.get(`/tasks/view-task/${notification._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        if (response.status === 200) {
          navigate(`/tasks/view-task/${notification._id}`);
          removeNotification(notification._id);
          setUnreadCount((prevCount) => Math.max(prevCount - 1, 0));
        }
      } else if (notification.type === 'suggestion-response') {
        const suggestionId = notification._id.split('-')[0];

        if (user.role === "Member") {
          await markResponseAsRead(suggestionId, notification.responseId);
        } else {
          await markSuggestionAsRead(suggestionId);
        }

        navigate(user.role === "Admin" ? "/admin/suggestions" : "/my-suggestions");
        removeNotification(notification._id);
        setUnreadCount((prevCount) => Math.max(prevCount - 1, 0));
      }
      else if (notification.type === 'suggestion-admin') {
        await markSuggestionAsRead(notification._id);
        navigate('/admin/suggestions');
        removeNotification(notification._id);
        setUnreadCount((prevCount) => Math.max(prevCount - 1, 0));
      }
      else if (notification.type.includes('policy')) {
        const policyId = notification._id.split('-')[0];
        let success = false;

        if (notification.type === 'policy-response') {
          // Admin viewing manager's response
          success = await markPolicyResponseAsRead(policyId, notification.logId);
          navigate('/policies'); // Ensure navigation happens
        } else if (notification.type === 'policy-admin') {
          // Manager viewing admin's creation
          success = await markPolicyAsRead(policyId);
          navigate('/policies'); // Ensure navigation happens
        }

        if (success) {
          removeNotification(notification._id);
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      }
      else if (notification.type === 'policy-admin') {
        const policyId = notification._id.split('-')[0];

        if (user.isManager) {
          await markPolicyAsRead(policyId);
        }

        navigate("/policies");
        removeNotification(notification._id);
        setUnreadCount((prevCount) => Math.max(prevCount - 1, 0));
      }
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  const getNotificationContent = (notification) => {
    switch (notification.type) {
      case 'task':
        return {
          title: notification.slid || 'New Task Assigned',
          description: `Task assigned by ${notification.createdBy?.name || 'a manager'}`,
          meta: (
            <>
              <span style={{ color: "#FF9900" }}>Priority:</span> {notification.priority} |{" "}
              <span style={{ color: "#006CE0" }}>Status:</span> {notification.status}
            </>
          ),
          icon: NOTIFICATION_ICONS["task"]
        };
      case 'suggestion-response':
        return {
          title: `Response to your suggestion: ${notification.title}`,
          description: notification.lastResponse?.response || 'New response to your suggestion',
          meta: `Status: ${notification.lastResponse?.status || notification.status}`,
          icon: NOTIFICATION_ICONS["suggestion"]
        };
      case 'suggestion-admin':
        return {
          title: `New suggestion from ${notification.user?.name || 'a user'}`,
          description: notification.title,
          meta: `Category: ${notification.category}`,
          icon: NOTIFICATION_ICONS["suggestion"]
        };
      case 'policy-response':
        return {
          title: `Manager responded to your policy: ${notification.name}`,
          description: notification.lastAction?.details || 'New response to your policy',
          meta: `Action: ${notification.lastAction?.action || notification.action}`,
          icon: NOTIFICATION_ICONS["policy"]
        };
      case 'policy-admin':
        return {
          title: `New policy ${notification.lastAction?.action === 'create' ? 'created' : 'updated'}`,
          description: notification.name,
          meta: `Action: ${notification.lastAction?.action}`,
          icon: NOTIFICATION_ICONS["policy"]
        };
      default:
        return {
          title: 'Notification',
          description: '',
          meta: '',
          icon: NOTIFICATION_ICONS["task"]
        };
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disableRipple
        sx={{
          height: '55px',
          minWidth: 0,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "end",
          "&:hover": { backgroundColor: "transparent" },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
          sx={{
            "& .MuiBadge-badge": {
              top: -5,
              right: -4,
              transform: "scale(1)",
              minWidth: "16px",
              height: "16px",
              fontSize: "10px",
              padding: "4px"
            }
          }}
        >
          <IoMdNotificationsOutline color="antiquewhite" size={28} />
        </Badge>
      </Button>

      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            backgroundColor: "#272727",
            color: "#ffffff",
            width: "400px",
            borderRadius: "8px",
            border: "1px solid #444",
            maxHeight: "500px",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 3,
            py: 2,
            backgroundColor: "#333",
            borderBottom: "1px solid #444",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            Notifications
          </Typography>
          <Button
            onClick={handleClose}
            sx={{ color: "#9e9e9e", "&:hover": { color: "#ffffff" } }}
          >
            <IoMdClose size={25} />
          </Button>
        </Stack>

        <Box sx={{ flex: 1, overflowY: "auto", maxHeight: "350px" }}>
          {memoizedNotifications.length === 0 ? (
            <MenuItem
              sx={{
                py: 2,
                px: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9e9e9e",
              }}
            >
              <Typography variant="body1">No notifications</Typography>
            </MenuItem>
          ) : (
            memoizedNotifications.map((notification) => {
              const content = getNotificationContent(notification);
              return (
                <MenuItem
                  key={notification._id}
                  onClick={() => {
                    handleViewNotification(notification);
                    handleClose();
                  }}
                  sx={{
                    py: 2,
                    px: 3,
                    "&:hover": { backgroundColor: "#333" },
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <Box
                      sx={{
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9e9e9e",
                      }}
                    >
                      {content.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: "bold", color: "#ffffff" }}>
                        {content.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#9e9e9e" }}>
                        {content.description}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#9e9e9e" }}>
                        {moment(notification.createdAt).fromNow()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#9e9e9e" }}>
                        {content.meta}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#9e9e9e" }}>
                        {notification.isRead ? "✅ Read" : "📩 Unread"}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationPanel;