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
  useTheme,
  Divider,
  Box,
  Chip
} from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import { useState } from "react";
import { MdClose, MdFileDownload } from "react-icons/md";
import { RiFileExcel2Fill } from "react-icons/ri";
import * as XLSX from 'xlsx';

const getCompanyViolations = (tasks) => {
  const companyViolations = {};

  // Group violations by company
  tasks.forEach((task) => {
    const { teamCompany, evaluationScore } = task;

    if (!teamCompany) return; // Skip if company is not defined

    if (!companyViolations[teamCompany]) {
      companyViolations[teamCompany] = {
        total: 0,
        tasks: [] // Store tasks for this company
      };
    }

    if (evaluationScore >= 1 && evaluationScore <= 6) {
      companyViolations[teamCompany].total += 1;
      companyViolations[teamCompany].tasks.push(task);
    } else if (evaluationScore >= 7 && evaluationScore <= 8) {
      companyViolations[teamCompany].total += 1;
      companyViolations[teamCompany].tasks.push(task);
    }
  });

  // Calculate total violations across all companies
  const totalViolations = Object.values(companyViolations).reduce((sum, violations) => sum + violations.total, 0);

  // Convert to array and add percentage
  return Object.entries(companyViolations).map(([company, violations]) => ({
    company,
    total: violations.total,
    percentage: ((violations.total / totalViolations) * 100).toFixed(2) + "%",
    tasks: violations.tasks // Include tasks in the result
  }));
};

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: '500',
        color: '#aaaaaa',
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

export const CompanyViolationTable = ({ tasks }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:503px)');
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyTasks, setCompanyTasks] = useState([]);
  const [open, setOpen] = useState(false);

  // Get the total violations for each company
  const companyViolations = getCompanyViolations(tasks);

  // Sort the companyViolations array in descending order based on total violations
  const sortedCompanyViolations = companyViolations.sort((a, b) => b.total - a.total);

  // Prepare rows for the DataGrid
  const rows = sortedCompanyViolations.map((violation, index) => ({
    id: index + 1,
    company: violation.company,
    totalViolations: violation.total,
    percentage: violation.percentage,
    tasks: violation.tasks // Store tasks with each row
  }));

  // Calculate the net total of all violations
  const netTotal = rows.reduce((sum, row) => sum + row.totalViolations, 0);

  // Handle company name click
  const handleCompanyClick = (company, tasks) => {
    setSelectedCompany(company);
    setCompanyTasks(tasks);
    setDialogOpen(true);
  };

  // Define columns for the DataGrid
  const columns = [
    {
      field: "company",
      headerName: "Group",
      flex: 2,
      minWidth: isMobile ? 150 : undefined,
      renderCell: (params) => (
        <Button
          onClick={() => handleCompanyClick(params.value, params.row.tasks)}
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
      field: "totalViolations",
      headerName: "Total Violations",
      flex: 1,
      type: "number",
      minWidth: isMobile ? 100 : undefined
    },
    {
      field: "percentage",
      headerName: "Percentage",
      flex: 1,
      minWidth: isMobile ? 80 : undefined
    },
  ];

  // Function to export table data to Excel
  const exportToExcel = () => {
    const excelData = rows.map((row) => ({
      Company: row.company,
      "Total Violations": row.totalViolations,
      Percentage: row.percentage,
    }));

    excelData.push({
      Company: "Net Total",
      "Total Violations": netTotal,
      Percentage: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Groups Violations");
    XLSX.writeFile(workbook, "Company_Violations.xlsx");
  };

  const exportCompanyTasksToExcel = () => {
    const data = companyTasks.map((task) => ({
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
      'Team Group': task.teamCompany,
      'Interview Date': task.interviewDate ? new Date(task.interviewDate).toLocaleString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({ wch: key.length + 5 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `${selectedCompany}_Tasks.xlsx`);
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
          }}
        >
          Violations Per Group ( <span style={{ color: "#03a9f4" }}>{netTotal}</span> )
          <IconButton
            size="small"
            onClick={() => setOpen(true)}
            sx={{
              backgroundColor: "#a00101",
              color: "#ffffff",
              width: 24,
              height: 24,
              ml: 1,
              borderRadius: "50%",
              p: 0,
              fontSize: "14px",
              lineHeight: 1.5,
              "&:hover": {
                backgroundColor: "#c20000",
              },
            }}
          >
            i
          </IconButton>

          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            maxWidth="xs"
            fullWidth
            PaperProps={{
              sx: {
                backgroundColor: "#1e1e1e", // Dark background
                color: "#ffffff",           // White text
                borderRadius: 2,
                p: 2,
              },
            }}
          >
            <DialogTitle sx={{ color: "#ffffff", fontSize: "18px", fontWeight: "bold" }}>
              Statistics Disclaimer
            </DialogTitle>
            <DialogContent>
              <Typography fontSize="14px" color="#dddddd">
                Note: The statistics in this section may not be fully accurate due to recent changes in group names and the migration of some teams between groups.
              </Typography>
            </DialogContent>
          </Dialog>


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
        backgroundColor: "#272727",
        overflow: "hidden" // Prevent double scrollbars
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableVirtualization={true}
          disableColumnResize
          pageSizeOptions={[5, 10, 25]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sx={{
            border: 0,
            color: "#ffffff",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#333",
              color: "#9e9e9e",
              fontSize: "0.875rem",
              fontWeight: "bold",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#333",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #444",
            },
            "& .MuiDataGrid-row": {
              "&:hover": {
                backgroundColor: "#333",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              minHeight: "64px",
              backgroundColor: "#333",
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
                backgroundColor: "#444",
              },
            },
            "& .MuiDataGrid-scrollbarFiller": {
              backgroundColor: "#333",
            },
          }}
        />
      </Paper>

      {/* Dialog to show company tickets */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            boxShadow: 'none',
            borderRadius: fullScreen ? '0px' : '8px',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
          padding: '16px 24px',
        }}>
          <Typography variant="h6" component="div">
            All Tasks for Group: {selectedCompany}
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

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
          <Stack spacing={3}>
            {companyTasks.map((task, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: '#272727',
                  borderRadius: 2,
                  border: '1px solid #444'
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#3ea6ff' }}>
                  Task {index + 1}
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  {/* Column 1 */}
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
                                task.evaluationScore >= 7 ? '#9e9e9e' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        />
                      }
                    />
                    <DetailRow label="Customer Name" value={task.customerName} />
                    <DetailRow label="Contact Number" value={task.contactNumber} />
                  </Box>

                  {/* Column 2 */}
                  <Box>
                    <DetailRow label="Tariff Name" value={task.tarrifName} />
                    <DetailRow label="Customer Feedback" value={task.customerFeedback} />
                    <DetailRow label="Reason" value={task.reason} />
                    <DetailRow label="Customer Type" value={task.customerType} />
                    <DetailRow label="Governorate" value={task.governorate} />
                    <DetailRow label="District" value={task.district} />
                  </Box>
                </Box>

                {/* Subtasks section */}
                {task.subTasks && task.subTasks.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#3ea6ff', mb: 1 }}>
                      Subtasks
                    </Typography>
                    <Box sx={{
                      backgroundColor: '#333',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid #444'
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

                {/* Team info at bottom */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mt: 3,
                  pt: 2,
                  borderTop: '1px solid #444',
                  flexWrap: 'wrap',
                  gap: 2
                }}>
                  <DetailRow label="Team Name" value={task.teamName} />
                  <DetailRow label="Team Group" value={task.teamCompany} />
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

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
          padding: '12px 24px',
        }}>
          <Button
            onClick={exportCompanyTasksToExcel}
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