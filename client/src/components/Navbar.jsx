import { useState, useEffect, useRef, useCallback } from "react";
import { MdOutlineSearch, MdClose, MdMoreVert, MdChevronLeft, MdOutlineMenuOpen } from "react-icons/md";
import { useNavigate, Link } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import NotificationPanel from "./NotificationPanel";
import api from "../api/api";
import { BeatLoader } from "react-spinners";
import { Box, Button, Divider, Menu, MenuItem, Stack, Typography, Drawer, IconButton } from "@mui/material";
import { DocsMenu } from "./DocsMenu";
import { PoliciesMenu } from "./PoliciesMenu";
import useMediaQuery from '@mui/material/useMediaQuery';
import { IoMdClose } from "react-icons/io";
import CustomerIssueDialog from "./CustomerIssueDialog";
import { useSelector } from "react-redux";

const Navbar = ({ toggleSidebar, isSidebarOpen }) => {
  const user = useSelector((state) => state?.auth?.user);
  const navigate = useNavigate();
  const isMediumSize = useMediaQuery('(max-width:800px)');

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchBarRef = useRef(null);
  const [cinDialogOpen, setCinDialogOpen] = useState(false);

  // Mobile menu state (for Docs/Policies)
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const openMobileMenu = Boolean(mobileMenuAnchor);

  // Drawer states for mobile view
  const [docsDrawerOpen, setDocsDrawerOpen] = useState(false);
  const [policiesDrawerOpen, setPoliciesDrawerOpen] = useState(false);

  // Desktop menu states
  const [DocsMenuAnchorEl, setDocsMenuAnchorEl] = useState(null);
  const openDocsMenu = Boolean(DocsMenuAnchorEl);
  const [policiesMenuAnchorEl, setPoliciesMenuAnchorEl] = useState(null);
  const openPolicyMenu = Boolean(policiesMenuAnchorEl);

  const handleClickOpenDocsMenu = (event) => {
    if (isMediumSize) {
      setDocsDrawerOpen(true);
    } else {
      setDocsMenuAnchorEl(event?.currentTarget);
    }
  };

  const handleClickOpenPoliciesMenu = (event) => {
    if (isMediumSize) {
      setPoliciesDrawerOpen(true);
    } else {
      setPoliciesMenuAnchorEl(event?.currentTarget);
    }
  };

  const handleCloseDocsMenu = () => {
    setDocsMenuAnchorEl(null);
  };
  const handleClosePoliciesMenu = () => {
    setPoliciesMenuAnchorEl(null);
  };
  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };
  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleCinSubmit = async (formData) => {
    try {
      const response = await api.post("/customer-issues-notifications", formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      // console.log("Issue submitted successfully:", response.data);
      alert("Issue submitted successfully!");
      // You might want to add a success notification here
    } catch (error) {
      // console.error("Error submitting issue:", error);
      // You might want to add an error notification here
    }
  };

  // Search functionality
  const fetchTasks = useCallback(async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get("/tasks/search-tasks", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        params: { query },
      });
      setSearchResults(response.data.filter((task) => !task.isDeleted));
    } catch (error) {
      // console.error("Error searching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchTasks(searchQuery), 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchTasks]);

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/view-task/${taskId}`);
    setShowResults(false);
    setSearchQuery("");
  };

  const toggleSearch = () => {
    setShowSearch(prev => !prev);
    if (!showSearch) {
      setTimeout(() => {
        searchBarRef.current?.querySelector('input')?.focus();
      }, 100);
    }
  };

  return (
    <>
      {/* Left Section - Hamburger and Search */}
      <div className={`h-[48px] flex items-center ${isMediumSize ? 'gap-1' : 'gap-4'}`}>
        <IconButton
          onClick={toggleSidebar}
          sx={{
            color: 'white',
            '&:hover': {
              color: 'grey.200',
              backgroundColor: 'transparent' // Optional: remove hover background
            },
            fontSize: '24px' // Adjust size as needed
          }}
          size="small"
        >
          {isSidebarOpen ? (
            <MdChevronLeft style={{ fontSize: `${isMediumSize ? '28px' : '38px'}` }} />
          ) : (
            <MdOutlineMenuOpen style={{ fontSize: `${isMediumSize ? '28px' : '38px'}` }} />
          )}
        </IconButton>

        {/* Search Bar Container */}
        {(!isMediumSize || showSearch) && (
          <div
            ref={searchBarRef}
            className={`relative ${isMediumSize ? 'w-[180px]' : 'w-[300px]'
              } flex items-center py-2 px-4 gap-2 rounded-full bg-[#121212] border border-[#444] focus-within:border-[#3ea6ff] transition-all`}
          >
            <MdOutlineSearch className="text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search by SLID..."
              className="flex-1 outline-none bg-transparent placeholder:text-gray-700 text-gray-100 text-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 absolute right-4 hover:text-gray-200"
              >
                <MdClose className="text-xl" />
              </button>
            )}
            {/* Close search button in mobile view */}
            {isMediumSize && showSearch && (
              <button
                onClick={toggleSearch}
                className="text-gray-400 hover:text-gray-200"
              >
                <MdClose className="text-xl" />
              </button>
            )}
          </div>
        )}

        {/* Search Icon - only on small mobile when search is hidden */}
        {isMediumSize && !showSearch && (
          <button
            onClick={toggleSearch}
            className="text-2xl text-gray-400 hover:text-gray-200"
          >
            <MdOutlineSearch />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Three dots menu for Docs/Policies on small mobile */}
        {isMediumSize && (
          <>
            <Button
              onClick={handleMobileMenuOpen}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: 'gray.400',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: 'white'
                },
              }}
            >
              <MdMoreVert size={28} />
            </Button>
            <Menu
              id="mobile-menu"
              anchorEl={mobileMenuAnchor}
              open={openMobileMenu}
              onClose={handleMobileMenuClose}
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
                  width: "280px",
                  borderRadius: "8px",
                  border: "1px solid #444",
                  maxHeight: "500px",
                },
              }}
            >
              {/* Menu Header */}
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
                  Menu
                </Typography>
                <Button
                  onClick={handleMobileMenuClose}
                  sx={{
                    color: "#9e9e9e",
                    minWidth: 0,
                    "&:hover": { color: "#ffffff" }
                  }}
                >
                  <IoMdClose size={20} />
                </Button>
              </Stack>

              {/* Menu Items */}
              <Box sx={{ py: 1 }}>
                <MenuItem
                  onClick={() => {
                    handleClickOpenDocsMenu(null);
                    handleMobileMenuClose();
                  }}
                  sx={{
                    py: 1.5,
                    px: 3,
                    "&:hover": { backgroundColor: "#333" },
                  }}
                >
                  <Typography variant="body1">Docs</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleClickOpenPoliciesMenu(null);
                    handleMobileMenuClose();
                  }}
                  sx={{
                    py: 1.5,
                    px: 3,
                    "&:hover": { backgroundColor: "#333" },
                  }}
                >
                  <Typography variant="body1">Policies</Typography>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setCinDialogOpen(true);
                    handleMobileMenuClose();
                  }}
                  sx={{
                    py: 1.5,
                    px: 3,
                    "&:hover": { backgroundColor: "#333" },
                    cursor: user?.role === "Admin" ? "pointer" : "not-allowed",
                  }}
                >
                  <Typography variant="body1">Report Issue</Typography>
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/customer-issues"
                  onClick={handleMobileMenuClose}
                  sx={{
                    py: 1.5,
                    px: 3,
                    "&:hover": { backgroundColor: "#333" },
                  }}
                >
                  <Typography variant="body1">Issues List</Typography>
                </MenuItem>
              </Box>
            </Menu>
          </>
        )}

        {/* Desktop view for Docs, Policies, CIN and Issues List */}
        {!isMediumSize && (
          <>
            <Button
              id="docs-menu-anchor"
              onClick={handleClickOpenDocsMenu}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: 'gray.400',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: 'white'
                },
              }}
            >
              Docs
            </Button>
            <Menu
              id="docs-menu"
              anchorEl={DocsMenuAnchorEl}
              open={openDocsMenu}
              onClose={handleCloseDocsMenu}
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
                  width: "300px",
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
                  Documentation
                </Typography>
                <Button
                  onClick={handleCloseDocsMenu}
                  sx={{ color: "#9e9e9e", "&:hover": { color: "#ffffff" } }}
                >
                  <IoMdClose size={25} />
                </Button>
              </Stack>
              <DocsMenu
                handleCloseDocsMenu={handleCloseDocsMenu}
              />
            </Menu>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#483c3c" }} orientation="vertical" />

            <Button
              id="policies-menu-anchor"
              onClick={handleClickOpenPoliciesMenu}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: 'gray.400',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: 'white'
                },
              }}
            >
              Policies
            </Button>
            <Menu
              id="policies-menu"
              anchorEl={policiesMenuAnchorEl}
              open={openPolicyMenu}
              onClose={handleClosePoliciesMenu}
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
                  Policies
                </Typography>
                <Button
                  onClick={handleClosePoliciesMenu}
                  sx={{ color: "#9e9e9e", "&:hover": { color: "#ffffff" } }}
                >
                  <IoMdClose size={25} />
                </Button>
              </Stack>
              <PoliciesMenu
                handleClosePoliciesMenu={handleClosePoliciesMenu}
              />
            </Menu>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#483c3c" }} orientation="vertical" />

            <Button
              onClick={() => {
                if (user?.role !== 'Admin') return;
                setCinDialogOpen(true);
              }}
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: user?.role === 'Admin' ? 'pointer' : 'not-allowed',
                color: user?.role === 'Admin' ? 'gray.400' : 'gray.600',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: user?.role === 'Admin' ? 'white' : 'gray.600'
                },
                "&.Mui-disabled": {
                  color: 'gray.600',
                  opacity: 0.7
                }
              }}
            >
              Report Issue
            </Button>

            <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#483c3c" }} orientation="vertical" />

            <Button
              component={Link}
              to="/customer-issues"
              disableRipple
              sx={{
                height: '55px',
                minWidth: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: 'gray.400',
                "&:hover": {
                  backgroundColor: "transparent",
                  color: 'white'
                },
              }}
            >
              Issues List
            </Button>
          </>
        )}

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#483c3c" }} orientation="vertical" />

        <NotificationPanel />

        <Divider sx={{ height: 24, borderRightWidth: 1, borderColor: "#483c3c" }} orientation="vertical" />

        <UserAvatar />

        {/* Docs Drawer */}
        <Drawer
          anchor="right"
          open={docsDrawerOpen}
          onClose={() => setDocsDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '400px' },
              backgroundColor: '#1e1e1e',
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Header */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              backgroundColor: '#272727',
              borderBottom: '1px solid #444'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Documentation
              </Typography>
              <IconButton onClick={() => setDocsDrawerOpen(false)} sx={{ color: '#9e9e9e' }}>
                <MdClose size={24} />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <DocsMenu />
            </Box>
          </Box>
        </Drawer>

        {/* Policies Drawer */}
        <Drawer
          anchor="right"
          open={policiesDrawerOpen}
          onClose={() => setPoliciesDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '450px' },
              backgroundColor: '#1e1e1e',
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Header */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              backgroundColor: '#272727',
              borderBottom: '1px solid #444'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Policies
              </Typography>
              <IconButton onClick={() => setPoliciesDrawerOpen(false)} sx={{ color: '#9e9e9e' }}>
                <MdClose size={24} />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <PoliciesMenu />
            </Box>
          </Box>
        </Drawer>
      </div>

      {/* Search Results Dropdown */}
      {searchQuery && showResults && (
        <div className="absolute top-[55px] left-4 w-full max-w-[300px] bg-[#272727] border border-[#444] rounded-lg z-50 overflow-hidden">
          <div className="flex justify-between items-center p-3 bg-[#333] border-b border-[#444]">
            <span className="text-sm font-medium text-gray-200">Search Results</span>
            <button
              onClick={() => setShowResults(false)}
              className="text-gray-400 hover:text-gray-200"
            >
              <MdClose />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-[#444]">
            {loading ? (
              <li className="p-4 flex justify-center">
                <BeatLoader color="#3ea6ff" />
              </li>
            ) : searchResults.length > 0 ? (
              searchResults.map((task) => (
                <li
                  key={task._id}
                  className="p-3 hover:bg-[#333] cursor-pointer text-gray-100"
                  onClick={() => handleTaskClick(task._id)}
                >
                  {task.slid}
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-gray-400">No results found</li>
            )}
          </ul>
        </div>
      )}

      {/* Customer Issue Dialog */}
      <CustomerIssueDialog
        open={cinDialogOpen}
        onClose={() => setCinDialogOpen(false)}
        onSubmit={handleCinSubmit}
      />
    </>
  );
};

export default Navbar;