import { Box, Stack, Tooltip, Typography, MenuItem, Menu, Divider } from '@mui/material';
import DownloadDialog from './DownloadDialog';
import { useState } from 'react';
import { FaFileAlt, FaDownload } from 'react-icons/fa';

const MenuHeader = ({ title, icon }) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    sx={{
      px: 3,
      py: 1.5,
      backgroundColor: "#1e1e1e",
      borderBottom: "1px solid #444",
    }}
  >
    {icon}
    <Typography variant="subtitle2" sx={{ fontWeight: "600", color: "#ffffff" }}>
      {title}
    </Typography>
  </Stack>
);

const MenuLink = ({ title, tooltipTitle, onClick }) => (
  <MenuItem
    onClick={onClick}
    sx={{
      py: 1.5,
      px: 3,
      borderRadius: '8px',
      m: 1,
      "&:hover": {
        backgroundColor: "#FFFFFF0F",
        color: "#3ea6ff",
      },
    }}
  >
    <Tooltip title={tooltipTitle} arrow>
      <Stack direction="row" alignItems="center" spacing={2}>
        <FaFileAlt style={{
          color: "#3ea6ff",
          fontSize: 16,
          flexShrink: 0
        }} />
        <Typography
          variant="body2"
          sx={{
            maxWidth: 200,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            display: "block",
            color: "inherit"
          }}
        >
          {title}
        </Typography>
      </Stack>
    </Tooltip>
  </MenuItem>
);

export const DocsMenu = ({ anchorEl, open, onClose, isDrawer = false }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleMenuItemClick = (fileUrl) => {
    setSelectedFile(fileUrl);
    setIsDialogOpen(true);
    if (isDrawer) {
      onClose?.(); // Close the drawer if this is a drawer context
    }
  };

  const handleDownload = () => {
    window.open(selectedFile, '_blank');
    setIsDialogOpen(false);
    setSelectedFile(null);
  };

  const shredWithFieldTeams = [
    {
      title: "Comprehensive Action Plan for Training Field Teams and Improving NPS",
      href: "https://drive.google.com/file/d/1NSgGNi1qWC9UiWLEmJOxesx5IOZwyAcf/view?usp=sharing",
    },
    {
      title: "Factors affecting gaming ping in arabic",
      href: "https://drive.google.com/file/d/1yV_OSTqxoWUBxvhiFV7nj-FH4HYdxpA3/view?usp=drive_link",
    },
    {
      title: "Factors Affecting VPN Connections in arabic",
      href: "https://drive.google.com/file/d/1vn3uGGRIWxmwPIvWgEA0F4uQdFZHSUn7/view?usp=drive_link",
    },
    {
      title: "Labeling Standard",
      href: "https://drive.google.com/file/d/1kqNm-6EtBSUf8M0yWrJ1mWT2FmmF68oB/view?usp=drive_link",
    },
    {
      title: "Nokia G-140W-C Configuration",
      href: "https://drive.google.com/file/d/15P_OzblC8a6tIIyQfpE4_DBEpYXxCp6R/view?usp=drive_link",
    },
    {
      title: "Nokia G-2426G-P (WiFi 6)",
      href: "https://drive.google.com/file/d/1i-88cqu5lfa4_gXmIPI1EzF9V-i4NM8O/view?usp=drive_link",
    },
    {
      title: "ONT Config Steps - NOKIA Type-H",
      href: "https://drive.google.com/file/d/18DoLwOu5VHlak47-wBRp00wXAjso_Nt4/view?usp=drive_link",
    },
    {
      title: "The best place for wireless router in arabic",
      href: "https://drive.google.com/file/d/14AOMy7zwogwnlrt9azJ2TYiognxG4llY/view?usp=drive_link",
    },
    {
      title: "Tips on how to talk to customers in arabic",
      href: "https://drive.google.com/file/d/1gZdSFiyxVdjAxHLdI2UuZZAytwIZCKKP/view?usp=drive_link",
    },
    {
      title: "Troubleshoot common IPTV problems in arabic",
      href: "https://drive.google.com/file/d/1OicDupRWjCX75kc3EoDl46qQVG_z4sSf/view?usp=drive_link",
    },
    {
      title: "ZTE F6600P",
      href: "https://drive.google.com/file/d/1JTbu7c5LxUPGZMMywE_1A4fPQ46mWrdY/view?usp=drive_link",
    },
    {
      title: "Being Effective Worker at Workplace",
      href: "https://drive.google.com/file/d/1wSSfzr_hxtPO0vZSMyPeLPQu8W7vxrky/view?usp=drive_link",
    },
    {
      title: "Electrod lifetime",
      href: "https://drive.google.com/file/d/14KX8PnfBTDn2yPkLPQFMXdACbMmqgK2g/view?usp=drive_link",
    },
    {
      title: "Factors affect optical fiber splicing loss",
      href: "https://drive.google.com/file/d/1ksbOKaVe4cE1Y7ibxNpmqhkWoq5rbHbt/view?usp=drive_link",
    },
    {
      title: "fusion-splicing arc calibration and cleaning session .-44-46",
      href: "https://drive.google.com/file/d/1iU2Yz5PWyuu54p8A7h_pZqaPEzN464eo/view?usp=drive_link",
    },
    {
      title: "How to check the strength of your Wi-Fi signal and interpret or improve its strength level",
      href: "https://drive.google.com/file/d/1Lua0kWIdVTKvmYsVDEI_MxFElsIRl7aO/view?usp=drive_link",
    },
    {
      title: "Media Streamers Tech Specifications",
      href: "https://drive.google.com/file/d/1Ev2Lx1wkFcsZ2kd4WIbDmYzUKpS1LOih/view?usp=drive_link",
    },
    {
      title: "Must-have Tools for Fiber Optic Technicians",
      href: "https://docs.google.com/document/d/1pjJNIKl9P3oLpiqNHe71oSsZy6sUUedC/edit?usp=drive_link&ouid=109709095419447676835&rtpof=true&sd=true",
    },
    {
      title: "ways to troubleshoot and fix any Wi-Fi problems you're encountering",
      href: "https://docs.google.com/document/d/1TXluJoZyAcBuTcENXTfpYJX9Zo3gihsS/edit?usp=drive_link&ouid=109709095419447676835&rtpof=true&sd=true",
    },
    {
      title: "WiFi",
      href: "https://drive.google.com/file/d/1jbfbxrOjJv1Erk9wn08AjvOlviK0Yr1r/view?usp=drive_link",
    },
  ];

  const qosRelatedDocs = [
    { title: "Effective Strategies to Boost NPS Score", href: "https://drive.google.com/uc?export=download&id=10BcFCraai2s0ede-eK4KSXYqgLmfou5m" },
    { title: "Site Inspection Checklist 2024", href: "https://drive.google.com/uc?export=download&id=1Y7H0XFl4nkRCiucOO874fx6Ot4JVgn11" },
  ];

  const menuContent = (
    <div>
      <MenuHeader
        title="Shared with Field Teams"
        icon={<FaFileAlt style={{ color: "#3ea6ff", fontSize: 16 }} />}
      />
      <Box sx={{
        flex: 1,
        overflowY: "auto",
        maxHeight: "300px",
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#444',
          borderRadius: '3px',
        },
      }}>
        {shredWithFieldTeams.map((item, index) => (
          <MenuLink
            key={index}
            title={item.title}
            tooltipTitle={item.title}
            onClick={() => handleMenuItemClick(item.href)}
          />
        ))}
      </Box>

      <Divider sx={{ mt: 1, backgroundColor: "#444" }} />

      <MenuHeader
        title="QoS-Related"
        icon={<FaFileAlt style={{ color: "#3ea6ff", fontSize: 16 }} />}
      />
      <Box sx={{
        flex: 1,
        overflowY: "auto",
        maxHeight: "300px",
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#444',
          borderRadius: '3px',
        },
      }}>
        {qosRelatedDocs.map((item, index) => (
          <MenuLink
            key={index}
            title={item.title}
            tooltipTitle={item.title}
            onClick={() => handleMenuItemClick(item.href)}
          />
        ))}
      </Box>
    </div>
  );

  if (isDrawer) {
    return (
      <div>
        {menuContent}
        <DownloadDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onPasscodeValid={handleDownload}
        />
      </div>
    );
  }

  return (
    <div>
      <Menu
        id="docs-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#121212',
            color: '#A1A1A1',
            width: '300px',
            borderRadius: '12px',
            border: '1px solid #444',
            padding: '0',
            maxHeight: 'calc(100vh - 100px)',
            overflow: 'hidden',
          },
          '& .MuiMenuItem-root': {
            padding: '8px 4px',
            borderRadius: '8px',
            fontSize: '14px',
            m: 1,
            '&:hover': {
              backgroundColor: '#FFFFFF0F',
              color: '#ffffff',
            },
          },
        }}
      >
        {menuContent}
      </Menu>

      <DownloadDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onPasscodeValid={handleDownload}
      />
    </div>
  );
}

