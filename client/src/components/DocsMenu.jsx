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
      title: "ONT Config Steps - NOKIA Type-H",
      href: "https://drive.google.com/uc?export=download&id=1nkPvcN1Zq9zH0V5s0FDaqrhOrRPZh7uT",
    },
    {
      title: "Nokia G-140W-C Configuration",
      href: "https://drive.google.com/uc?export=download&id=1JKXIVBdhTGmhC5chmdaPnuYY3wIWFXhv",
    },
    {
      title: "ZTE F6600P",
      href: "https://drive.google.com/uc?export=download&id=1ULDpENcnuhsJyj7SwJvUQbT_THs1QBc3",
    },
    {
      title: "Factors affecting gaming ping in arabic",
      href: "https://drive.google.com/uc?export=download&id=1tWQ2R__RkVC27uar6eYV39ns49K3J4tu",
    },
    {
      title: "Factors Affecting VPN Connections in arabic",
      href: "https://drive.google.com/uc?export=download&id=1F8kqyOlcRwxZ7r8p-wqQR_HFIiL4_Tq7",
    },
    {
      title: "Troubleshoot common IPTV problems in arabic",
      href: "https://drive.google.com/uc?export=download&id=1bwAw_XjzyWRRYlEhbAZqv6pgCT5U0Y5v",
    },
    {
      title: "The best place for wireless router in arabic",
      href: "https://drive.google.com/uc?export=download&id=1uQt-SmbqsWMfCrdnMSvTghdw2Mj2tsZL",
    },
    {
      title: "Labeling Standard",
      href: "https://drive.google.com/uc?export=download&id=1KM6fRTuaYsQK7TWId6pRd_h2g4MJm0Ne",
    },
    {
      title: "Tips on how to talk to customers in arabic",
      href: "https://drive.google.com/uc?export=download&id=1qaH3iHVdKMCY2nmWaYNx0WLMB5Vzg7vX",
    },
    {
      title: "fusion-splicing arc calibration and cleaning session",
      href: "https://drive.google.com/uc?export=download&id=1sJVTOMsQMBZtI9Kqh7HyZDgYR1sZ9qAH",
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

