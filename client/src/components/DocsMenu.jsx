import { Box, Stack, Tooltip, Typography, MenuItem } from '@mui/material';
import DownloadDialog from './DownloadDialog';
import { useState } from 'react';

const MenuHeader = ({ title }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    sx={{
      px: 3,
      py: 2,
      backgroundColor: "darkslategrey",
      borderBottom: "1px solid #444",
    }}
  >
    <Typography variant="h6" sx={{ fontWeight: "bold", color: "#ffffff" }}>
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
      "&:hover": { backgroundColor: "#333", color: "#3ea6ff" },
    }}
  >
    <Tooltip title={tooltipTitle}>
      <Typography
        variant="body2"
        sx={{
          maxWidth: 200,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          display: "block",
        }}
      >
        {title}
      </Typography>
    </Tooltip>
  </MenuItem>
);

export const DocsMenu = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleMenuItemClick = (fileUrl) => {
    setSelectedFile(fileUrl);
    setIsDialogOpen(true);
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

  return (
    <>
      {/* <Menu
        id="docs-menu"
        onClose={handleCloseDocsMenu}
        anchorOrigin={{
          vertical: "top",
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
          },
        }}
      > */}
      <MenuHeader title="Shared with Field Teams" />
      <Box sx={{ flex: 1, overflowY: "auto", maxHeight: "200px" }}>
        {shredWithFieldTeams.map((item, index) => (
          <MenuLink
            key={index}
            title={item.title}
            tooltipTitle={item.title}
            onClick={() => handleMenuItemClick(item.href)}
          />
        ))}
      </Box>

      <MenuHeader title="QoS-Related" />
      <Box sx={{ flex: 1, overflowY: "auto", maxHeight: "200px" }}>
        {qosRelatedDocs.map((item, index) => (
          <MenuLink
            key={index}
            title={item.title}
            tooltipTitle={item.title}
            onClick={() => handleMenuItemClick(item.href)}
          />
        ))}
      </Box>
      {/* </Menu> */}

      <DownloadDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onPasscodeValid={handleDownload}
      />
    </>
  );
}
