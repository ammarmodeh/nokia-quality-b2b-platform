import {
  Paper,
  Stack,
  Typography,
  Button,
  useMediaQuery,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Box,
  Chip,
  useTheme
} from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { getKnowledgeGapReasons2 } from "../utils/helpers";
import { RiFileExcel2Fill } from "react-icons/ri";
import { MdClose, MdFileDownload, MdInfo } from "react-icons/md";
import { useState } from "react";

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: '500',
        color: '#b3b3b3',
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant="body1"
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word',
          textAlign: label === "Customer Feedback" ? "right" : "left",
          direction: label === "Customer Feedback" ? "rtl" : "ltr"
        }}
      >
        {value || 'N/A'}
      </Typography>
    ) : (
      <Box sx={{ display: 'inline-block', mt: 0.5 }}>
        {value}
      </Box>
    )}
  </Box>
);

export const KnowledgeGapReasonsTable = ({ tasks = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:503px)');
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reasonTasks, setReasonTasks] = useState([]);

  const knowledgeGapReasons = getKnowledgeGapReasons2(tasks);

  const rows = knowledgeGapReasons.map((item, index) => ({
    id: index + 1,
    reason: item.reason,
    count: item.count,
    percentage: item.percentage,
    tasks: item.tasks // Include tasks in the row data
  }));

  const netTotal = rows.reduce((sum, row) => sum + row.count, 0);

  const handleReasonClick = (reason, tasks) => {
    setSelectedReason(reason);
    setReasonTasks(tasks);
    setDialogOpen(true);
  };

  const columns = [
    {
      field: "reason",
      headerName: "Reason",
      flex: 2,
      minWidth: isMobile ? 150 : undefined,
      renderCell: (params) => (
        <Button
          onClick={() => handleReasonClick(params.value, params.row.tasks)}
          sx={{
            textTransform: 'none',
            color: '#ffffff',
            padding: 0,
            minWidth: 0,
            '&:hover': {
              textDecoration: 'underline',
              backgroundColor: 'transparent'
            }
          }}
        >
          {params.value}
        </Button>
      )
    },
    {
      field: "count",
      headerName: "Count",
      flex: 1,
      type: "number",
      minWidth: isMobile ? 80 : undefined
    },
    {
      field: "percentage",
      headerName: "Percentage",
      flex: 1,
      minWidth: isMobile ? 80 : undefined
    },
  ];

  const exportToExcel = () => {
    const excelData = rows.map((row) => ({
      Reason: row.reason,
      Count: row.count,
      Percentage: row.percentage,
    }));

    excelData.push({
      Reason: "Net Total",
      Count: netTotal,
      Percentage: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Knowledge Gap");
    XLSX.writeFile(workbook, "Knowledge_Gap_Reasons.xlsx");
  };

  const exportReasonTasksToExcel = () => {
    const data = reasonTasks.map((task) => ({
      'Request Number': task.requestNumber,
      'SLID': task.slid,
      'PIS Date': task.pisDate ? new Date(task.pisDate).toLocaleString() : 'N/A',
      'Satisfaction Score': task.evaluationScore,
      'Customer Name': task.customerName,
      'Contact Number': task.contactNumber,
      'Tariff Name': task.tarrifName,
      'Customer Feedback': task.customerFeedback,
      'Reason': task.reason,
      'Customer Type': task.customerType,
      'Governorate': task.governorate,
      'District': task.district,
      'Action taken by assigned user': task.subTasks?.map((sub, index) => `Step ${index + 1}: ${sub.note}`).join('\n') || 'N/A',
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'Interview Date': task.interviewDate ? new Date(task.interviewDate).toLocaleString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({ wch: key.length + 5 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `${selectedReason}_Tasks.xlsx`);
  };

  return (
    <Stack justifyContent={"center"} sx={{ width: "100%" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          marginBottom: "10px",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="h6"
          // fontWeight="bold"
          sx={{
            color: "#c2c2c2",
            fontSize: isMobile ? "0.9rem" : "1rem",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          Knowledge Gap Issues ( <span style={{ color: "#03a9f4" }}>{netTotal}</span> )
          <Tooltip
            title="Customer Education or Tech Skills (Unclear)"
            placement="top"
            arrow
          >
            <IconButton size="small" sx={{ color: "#ffffff", p: 0 }}>
              <MdInfo style={{ color: "#7998ff" }} fontSize="20px" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Tooltip title="Export to Excel">
          <IconButton
            onClick={exportToExcel}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#4caf50',
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
              }
            }}
          >
            <RiFileExcel2Fill fontSize={isMobile ? "16px" : "20px"} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Paper sx={{
        height: 370,
        width: "100%",
        backgroundColor: "#2d2d2d",
        overflow: "hidden"
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableColumnResize
          pageSizeOptions={[5, 10, 25]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableVirtualization={true}
          sx={{
            border: 0,
            color: "#ffffff",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#2d2d2d",
              color: "#b3b3b3",
              fontSize: "0.875rem",
              fontWeight: "bold",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#2d2d2d",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #e5e7eb",
            },
            "& .MuiDataGrid-row": {
              "&:hover": {
                backgroundColor: "#2d2d2d",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              minHeight: "64px",
              backgroundColor: "#2d2d2d",
              color: "#ffffff",
              "& .MuiTablePagination-root": {
                color: "#ffffff",
              },
            },
            "& .MuiDataGrid-virtualScroller": {
              "&::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#666",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#e5e7eb",
              },
            },
            "& .MuiDataGrid-scrollbarFiller": {
              backgroundColor: "#2d2d2d",
            },
          }}
        />
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        // maxWidth="md"
        // fullWidth
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#2d2d2d',
            boxShadow: 'none',
            borderRadius: fullScreen ? '0px' : '8px',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
        }}>
          <Typography variant="h6" component="div">
            All Tasks for Reason: {selectedReason}
          </Typography>
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
          <Stack spacing={3}>
            {reasonTasks.map((task, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#7b68ee' }}>
                  Task {index + 1}
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <DetailRow label="Request Number" value={task.requestNumber} />
                    <DetailRow label="SLID" value={task.slid} />
                    <DetailRow label="PIS Date" value={task.pisDate ? new Date(task.pisDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric'
                    }) : 'N/A'} />
                    <DetailRow
                      label="Satisfaction Score"
                      value={
                        <Chip
                          label={task.evaluationScore}
                          sx={{
                            color: '#ffffff',
                            backgroundColor:
                              task.evaluationScore >= 9 ? '#4caf50' :
                                task.evaluationScore >= 7 ? '#6b7280' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        />
                      }
                    />
                    <DetailRow label="Customer Name" value={task.customerName} />
                    <DetailRow label="Contact Number" value={task.contactNumber} />
                  </Box>

                  <Box>
                    <DetailRow label="Tariff Name" value={task.tarrifName} />
                    <DetailRow label="Customer Feedback" value={task.customerFeedback} />
                    <DetailRow label="Reason" value={task.reason} />
                    <DetailRow label="Customer Type" value={task.customerType} />
                    <DetailRow label="Governorate" value={task.governorate} />
                    <DetailRow label="District" value={task.district} />
                  </Box>
                </Box>

                {task.subTasks && task.subTasks.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#7b68ee', mb: 1 }}>
                      Subtasks
                    </Typography>
                    <Box sx={{
                      backgroundColor: '#2d2d2d',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid #3d3d3d'
                    }}>
                      {task.subTasks.map((sub, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>
                            <strong>Step {index + 1}:</strong> {sub.title} {sub.note && `- ${sub.note}`}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mt: 3,
                  pt: 2,
                  borderTop: '1px solid #e5e7eb',
                  flexWrap: 'wrap',
                  gap: 2
                }}>
                  <DetailRow label="Team Name" value={task.teamName} />
                  <DetailRow label="Team Company" value={task.teamCompany} />
                  <DetailRow label="Interview Date" value={task.interviewDate ? new Date(task.interviewDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  }) : 'N/A'} />
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogActions sx={{
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb',
          padding: '12px 24px',
        }}>
          <Button
            onClick={exportReasonTasksToExcel}
            variant="contained"
            startIcon={<MdFileDownload />}
            sx={{
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#1e40af',
              }
            }}
          >
            Export to Excel
          </Button>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
