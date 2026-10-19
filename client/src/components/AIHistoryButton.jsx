
import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Box
} from "@mui/material";
import { History as HistoryIcon, AccessTime as AccessTimeIcon } from "@mui/icons-material";
import api from "../api/api";
import AIInsightDialog from "./AIInsightDialog";

const AIHistoryButton = () => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/ai/report/history", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      setHistoryData(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleOpenHistory = () => {
    setHistoryOpen(true);
    fetchHistory();
  };

  const handleSelectReport = (report) => {
    // Format data for AIInsightDialog
    // It expects { analysis, metadata }
    // Our DB model has { analysis, metadata, periodTitle, generatedAt }
    // We can pass it directly or structure it.
    // The current aiController returns { analysis, metadata } where metadata has generatedAt.
    // Our DB item acts as this object.

    // Ensure metadata has generatedAt formatted
    const formattedData = {
      analysis: report.analysis,
      metadata: {
        ...report.metadata,
        generatedAt: new Date(report.generatedAt).toLocaleString(),
        period: report.periodTitle
      }
    };

    setSelectedReport(formattedData);
    setReportDialogOpen(true);
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpenHistory}
        startIcon={<HistoryIcon />}
        sx={{
          color: 'var(--text-secondary)',
          borderColor: 'var(--border)',
          marginLeft: '10px',
          textTransform: 'none',
          '&:hover': {
            borderColor: '#b3b3b3',
            backgroundColor: 'var(--overlay-subtle)'
          }
        }}
      >
        History
      </Button>

      {/* History List Dialog */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid var(--border)" }}>
          Report History
          <Typography variant="caption" display="block" sx={{ color: "var(--text-muted)", mt: 0.5 }}>
            Previous 50 generated reports
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {historyData.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center', color: 'var(--text-muted)' }}>
              No report history found.
            </Typography>
          ) : (
            <List>
              {historyData.map((item, index) => (
                <React.Fragment key={item._id || index}>
                  <ListItem
                    button
                    onClick={() => handleSelectReport(item)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#484848ff' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body1" sx={{ color: "var(--text)", fontWeight: 500 }}>
                          {item.periodTitle}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 14, color: "var(--text-muted)" }} />
                          <Typography variant="caption" sx={{ color: "var(--text-muted)" }}>
                            {new Date(item.generatedAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider sx={{ borderColor: "var(--border)" }} />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Viewer Dialog */}
      {selectedReport && (
        <AIInsightDialog
          open={reportDialogOpen}
          onClose={() => setReportDialogOpen(false)}
          insights={selectedReport.analysis}
          metadata={selectedReport.metadata}
          title={selectedReport.metadata?.period}
        />
      )}
    </>
  );
};

export default AIHistoryButton;
