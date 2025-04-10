import { useEffect, useState, useMemo } from "react";
import { Menu, MenuItem, Button, Typography, Box, Badge, Stack, Divider, Chip, Avatar } from "@mui/material";
import { BiSolidMessageRounded } from "react-icons/bi";
import { IoMdDocument, IoMdNotificationsOutline } from "react-icons/io";
import { IoMdClose } from "react-icons/io";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import api from "../api/api";

const NOTIFICATION_ICONS = {
  task: <IoMdNotificationsOutline className="h-5 w-5" />,
  'task-update': <IoMdNotificationsOutline className="h-5 w-5" />,
  'task-closed': <IoMdNotificationsOutline className="h-5 w-5" />,
  suggestion: <BiSolidMessageRounded className="h-5 w-5" />,
  policy: <IoMdDocument className="h-5 w-5" />,
};

const NotificationPanel = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const getInitials = (name = '') => {
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

  const markPolicyAsRead = async (policyId) => {
    try {
      const response = await api.patch(`/policies/${policyId}/mark-read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      return response.data.success;
    } catch (error) {
      // console.error('Mark policy as read failed:', error);
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
      return response.data.success;
    } catch (error) {
      // console.error("Error marking response as read:", error);
      return false;
    }
  };

  const markTaskNotificationAsRead = async (taskId, notificationId) => {
    try {
      const response = await api.put(
        `/tasks/${taskId}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      return response.status === 200;
    } catch (error) {
      // console.error("Error marking task notification as read:", error);
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
      // console.error("Error marking suggestion as read:", error);
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
      // console.error("Error marking response as read:", error);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [tasksResponse, suggestionsResponse, adminSuggestionsResponse, policiesResponse] = await Promise.all([
          api.get("/tasks/get-all-tasks", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }),
          user.role === "Member" ? api.get("/suggestions/user", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }) : { data: { data: [] } },
          user.role === "Admin" ? api.get("/suggestions", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }) : { data: { data: [] } },
          api.get("/policies/notifications", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          })
        ]);

        // Process tasks
        let taskNotifications = [];
        if (Array.isArray(tasksResponse.data)) {
          // 1. Assigned tasks (for users in assignedTo array)
          const myAssignedTasks = tasksResponse.data.filter((task) =>
            task.assignedTo.some((assignedUser) =>
              String(assignedUser._id || assignedUser) === String(user._id)
            )
          );

          taskNotifications = myAssignedTasks
            .filter((task) => !task.readBy.includes(user._id))
            .map((task) => ({
              ...task,
              type: 'task',
              createdAt: task.createdAt,
              isRead: task.readBy.includes(user._id)
            }));

          // 2. Task updates (for users in whomItMayConcern array)
          const taskUpdateNotifications = tasksResponse.data
            .filter(task =>
              task.whomItMayConcern &&
              task.whomItMayConcern.some(userRef =>
                String(userRef._id || userRef) === String(user._id)
              )
            )
            .flatMap(task =>
              (task.notifications || [])
                .filter(notif =>
                  String(notif.recipient?._id || notif.recipient) === String(user._id) &&
                  !notif.read &&
                  notif.type !== 'task-closed'
                )
                .map(notif => ({
                  ...task,
                  type: 'task-update',
                  notificationId: notif._id,
                  createdAt: notif.createdAt,
                  isRead: notif.read,
                  message: notif.message,
                  recipientId: notif.recipient?._id || notif.recipient
                }))
            );

          // 3. Closed task notifications
          const closedTaskNotifications = tasksResponse.data
            .filter(task =>
              task.notifications &&
              task.notifications.some(notif =>
                String(notif.recipient?._id || notif.recipient) === String(user._id) &&
                notif.type === 'task-closed' &&
                !notif.read
              )
            )
            .flatMap(task =>
              task.notifications
                .filter(notif =>
                  String(notif.recipient?._id || notif.recipient) === String(user._id) &&
                  notif.type === 'task-closed' &&
                  !notif.read
                )
                .map(notif => ({
                  ...task,
                  type: 'task-closed',
                  notificationId: notif._id,
                  createdAt: notif.createdAt,
                  isRead: notif.read,
                  message: notif.message,
                  recipientId: notif.recipient?._id || notif.recipient
                }))
            );

          taskNotifications = [...taskNotifications, ...taskUpdateNotifications, ...closedTaskNotifications];
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
              } else if (isManager && createdById !== user._id) {
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

        // Process suggestions
        let suggestionNotifications = [];
        if (Array.isArray(suggestionsResponse.data?.data)) {
          suggestionNotifications = suggestionsResponse.data.data
            .filter(suggestion => suggestion.responseLog?.length > 0)
            .flatMap(suggestion =>
              suggestion.responseLog
                .filter(response => !response.readBy?.includes(user._id))
                .map(response => ({
                  ...suggestion,
                  type: 'suggestion-response',
                  _id: `${suggestion._id}-${response._id}`,
                  responseId: response._id,
                  createdAt: response.respondedAt,
                  isRead: false,
                  lastResponse: response
                }))
            );
        }

        if (Array.isArray(adminSuggestionsResponse.data?.data)) {
          const adminSuggestions = adminSuggestionsResponse.data.data
            .filter(suggestion => !suggestion.readBy?.includes(user._id))
            .map(suggestion => ({
              ...suggestion,
              type: 'suggestion-admin',
              createdAt: suggestion.createdAt,
              isRead: false
            }));
          suggestionNotifications = [...suggestionNotifications, ...adminSuggestions];
        }

        // Combine and sort all notifications
        const allNotifications = [
          ...taskNotifications,
          ...suggestionNotifications,
          ...policyNotifications
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setUnreadCount(allNotifications.filter(n => !n.isRead).length);
        setNotifications(allNotifications);
      } catch (error) {
        // console.error("Error fetching notifications:", error);
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
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      }
      else if (notification.type === 'task-update') {
        const success = await markTaskNotificationAsRead(notification._id, notification.notificationId);
        if (success) {
          navigate(`/tasks/view-task/${notification._id}`);
          removeNotification(notification._id);
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      }
      else if (notification.type === 'task-closed') {
        const success = await markTaskNotificationAsRead(notification._id, notification.notificationId);
        if (success) {
          navigate(`/tasks/view-task/${notification._id}`);
          removeNotification(notification._id);
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      }
      else if (notification.type === 'suggestion-response') {
        const suggestionId = notification._id.split('-')[0];
        if (user.role === "Member") {
          await markResponseAsRead(suggestionId, notification.responseId);
        } else {
          await markSuggestionAsRead(suggestionId);
        }
        navigate(user.role === "Admin" ? "/admin/suggestions" : "/my-suggestions");
        removeNotification(notification._id);
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
      else if (notification.type === 'suggestion-admin') {
        await markSuggestionAsRead(notification._id);
        navigate('/admin/suggestions');
        removeNotification(notification._id);
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
      else if (notification.type === 'policy-response') {
        const success = await markPolicyResponseAsRead(notification._id.split('-')[0], notification.logId);
        if (success) {
          navigate('/policies');
          removeNotification(notification._id);
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      }
      else if (notification.type === 'policy-admin') {
        const success = await markPolicyAsRead(notification._id.split('-')[0]);
        if (success) {
          navigate("/policies");
          removeNotification(notification._id);
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      }
    } catch (error) {
      // console.error("Error handling notification:", error);
    }
  };

  const getNotificationContent = (notification) => {
    // console.log({ notification });
    switch (notification.type) {
      case 'task':
        return {
          title: notification.slid || 'New Task Assigned',
          description: `You have been assigned a new task`,
          actionUser: notification.createdBy,
          actionText: 'Assigned to you',
          icon: NOTIFICATION_ICONS["task"],
          date: notification.createdAt,
          assignedUsers: notification.assignedTo
        };
      case 'task-update':
        {
          const assignedUser = notification.assignedTo?.[0] || notification.updatedBy || "Unknown";
          return {
            title: `Task Updated: ${notification.slid}`,
            description: notification.message || `Task has been updated`,
            actionUser: assignedUser,
            actionText: 'Updated by',
            icon: NOTIFICATION_ICONS["task-update"],
            date: notification.updatedAt || notification.createdAt,
            assignedUsers: notification.assignedTo
          };
        }
      case 'task-closed':
        return {
          title: `Task Closed: ${notification.slid}`,
          description: notification.message || `Task has been closed`,
          actionUser: notification.closedBy || notification.createdBy,
          actionText: 'closed',
          icon: NOTIFICATION_ICONS["task-closed"],
          date: notification.closedAt || notification.updatedAt || notification.createdAt,
          assignedUsers: notification.assignedTo
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
          actionUser: notification.lastAction?.performedBy || "Manager",
          actionText: 'Responded by',
          icon: NOTIFICATION_ICONS["policy"],
          date: notification.lastAction?.performedAt || notification.lastUpdate || notification.createdAt,
          policyDetails: {
            createdBy: notification.createdBy,
            category: notification.category,
            lastUpdated: notification.lastUpdate
          }
        };
      case 'policy-admin':
        return {
          title: `New policy ${notification.lastAction?.action === 'create' ? 'created' : 'updated'}`,
          description: notification.name,
          meta: `Category: ${notification.category}`,
          actionUser: notification.createdBy || "Admin",
          actionText: notification.lastAction?.action === 'create' ? 'Created by' : 'Updated by',
          icon: NOTIFICATION_ICONS["policy"],
          date: notification.lastAction?.performedAt || notification.createdAt,
          policyDetails: {
            createdBy: notification.createdBy,
            category: notification.category,
            status: notification.status,
            effectiveDate: notification.effectiveDate
          }
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

  const renderUserAvatar = (userData, isUnread, size = 24) => {
    // console.log({ userData });
    const user = userData || { name: 'User' };
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar
          sx={{
            width: size,
            height: size,
            fontSize: size * 0.5,
            backgroundColor: isUnread ? '#FF4757' : '#555'
          }}
        >
          {getInitials(user.name)}
        </Avatar>
        <Typography variant="caption" sx={{
          color: isUnread ? '#FFA07A' : '#9e9e9e',
          fontWeight: isUnread ? 500 : 400
        }}>
          {user.name}
        </Typography>
      </Box>
    );
  };

  const renderDateInfo = (date, isUnread) => {
    const formattedDate = moment(date).format('MMM D, h:mm A');
    const timeAgo = moment(date).fromNow();

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={formattedDate}
          size="small"
          sx={{
            backgroundColor: isUnread ? 'rgba(255, 71, 87, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: isUnread ? '#FFA07A' : '#9e9e9e',
            fontSize: '0.65rem',
            height: '20px',
            '& .MuiChip-label': {
              padding: '0 6px'
            }
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: isUnread ? '#FFA07A' : '#777',
            fontSize: '0.65rem',
            fontStyle: 'italic'
          }}
        >
          ({timeAgo})
        </Typography>
      </Box>
    );
  };

  const renderUserChip = (userData, isUnread, size = 24) => {
    // console.log({ userData });
    const user = userData || { name: 'User' };
    return (
      <Chip
        // avatar={
        //   <Avatar
        //     sx={{
        //       width: size,
        //       height: size,
        //       fontSize: size * 0.5,
        //       backgroundColor: isUnread ? '#FF4757' : '#555'
        //     }}
        //   >
        //     {getInitials(user.name)}
        //   </Avatar>
        // }
        label={user.name}
        size="small"
        sx={{
          // backgroundColor: isUnread ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          backgroundColor: "transparent",
          color: isUnread ? '#FFA07A' : '#9e9e9e',
          "&.MuiChip-root": {
            "& span": {
              paddingLeft: '0'
            }
          }
          // height: '28px',
          // mr: 1,
          // mb: 1
        }}
      />
    );
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
              padding: "4px",
              fontWeight: 'bold',
              backgroundColor: '#FF4757',
              color: 'white'
            }
          }}
        >
          <IoMdNotificationsOutline
            color={unreadCount > 0 ? "#00efff" : "antiquewhite"}
            size={28}
          />
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
            backgroundColor: "#1E1E1E",
            color: "#E0E0E0",
            width: "420px",
            borderRadius: "12px",
            border: "1px solid #383838",
            maxHeight: "80vh", // Changed to viewport height percentage
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
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
            backgroundColor: "#252525",
            borderBottom: "1px solid #383838",
            flexShrink: 0,
          }}
        >
          <Typography variant="h6" sx={{
            fontWeight: "bold",
            color: "#FFFFFF",
            fontSize: '1.1rem'
          }}>
            Notifications {unreadCount > 0 && `(${unreadCount} new)`}
          </Typography>
          <Button
            onClick={handleClose}
            sx={{
              color: "#9e9e9e",
              minWidth: 'auto',
              padding: '4px',
              "&:hover": {
                color: "#ffffff",
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%'
              }
            }}
          >
            <IoMdClose size={20} />
          </Button>
        </Stack>

        {/* Notification List Container */}
        <Box sx={{
          flex: 1,
          overflowY: "auto", // Enable vertical scrolling
          maxHeight: "calc(80vh - 64px)", // Subtract header height
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#555",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          }
        }}>
          {memoizedNotifications.length === 0 ? (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              px: 2,
              textAlign: 'center'
            }}>
              <IoMdNotificationsOutline size={48} color="#555" />
              <Typography variant="body1" sx={{
                color: "#9e9e9e",
                mt: 2,
                fontSize: '0.95rem'
              }}>
                No notifications to display
              </Typography>
              <Typography variant="body2" sx={{
                color: "#666",
                mt: 1,
                fontSize: '0.85rem'
              }}>
                When you get notifications, they&apos;ll appear here
              </Typography>
            </Box>
          ) : (
            memoizedNotifications.map((notification, index) => {
              const content = getNotificationContent(notification);
              const isUnread = !notification.isRead;

              return (
                <Box key={notification._id}>
                  <MenuItem
                    onClick={() => {
                      handleViewNotification(notification);
                      handleClose();
                    }}
                    sx={{
                      py: 2,
                      px: 3,
                      whiteSpace: 'normal', // Allow text to wrap
                      alignItems: 'flex-start',
                      "&:hover": {
                        backgroundColor: isUnread ? '#00000042' : 'rgba(255, 255, 255, 0.08)',
                      },
                      backgroundColor: isUnread ? '#00000082' : 'transparent',
                      borderLeft: isUnread ? '3px solid #FF4757' : '3px solid transparent',
                      transition: 'all 0.2s ease',
                      display: "flex",
                      maxWidth: '100%',
                      position: 'relative',
                      '&:before': isUnread ? {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        left: 8,
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FF4757',
                        animation: 'pulse 1.5s infinite',
                      } : {}
                    }}
                  >
                    <Box sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "flex-start",
                      width: '100%',
                      maxWidth: '100%',
                    }}>
                      <Box sx={{
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isUnread ? "#FF4757" : "#9e9e9e",
                        backgroundColor: isUnread ? 'rgba(255, 71, 87, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }}>
                        {content.icon}
                      </Box>

                      <Box sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        width: '100%',
                      }}>
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 1,
                          width: '100%'
                        }}>
                          {renderDateInfo(content.date, isUnread)}
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: isUnread ? "600" : "500",
                              color: isUnread ? "#2ab4e3" : "#E0E0E0",
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {content.title}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{
                            width: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mt: 0.5,
                            color: isUnread ? "#D0D0D0" : "#9e9e9e",
                            fontSize: '0.875rem',
                          }}
                        >
                          {content.description}
                        </Typography>

                        {/* Action by user */}
                        {content.actionUser && (
                          // console.log({ content }),
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{
                              color: isUnread ? '#f39875' : '#9e9e9e',
                              mr: 1
                            }}>
                              {content.actionText} By:
                            </Typography>
                            {renderUserChip(content.actionUser, isUnread)}
                          </Box>
                        )}

                        <Box sx={{ mt: 1 }}>
                          {content.assignedBy && renderUserAvatar(content.assignedBy)}
                          {content.updatedBy && renderUserAvatar(content.updatedBy)}
                          {content.closedBy && renderUserAvatar(content.closedBy)}
                          {content.respondedBy && renderUserAvatar(content.respondedBy)}
                          {content.suggestedBy && renderUserAvatar(content.suggestedBy)}
                          {content.createdBy && renderUserAvatar(content.createdBy)}
                        </Box>
                      </Box>
                    </Box>
                  </MenuItem>
                  {index < memoizedNotifications.length - 1 && (
                    <Divider sx={{
                      borderColor: '#383838',
                      mx: 3,
                      my: 0,
                    }} />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationPanel;
