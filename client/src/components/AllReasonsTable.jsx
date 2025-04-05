import { Paper, Stack, Typography, Button, useMediaQuery } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { getReasonViolations } from "../utils/helpers";

export const AllReasonsTable = ({ tasks }) => {
  const isMobile = useMediaQuery('(max-width:503px)');

  // Get the total violations for each reason
  const reasonViolations = getReasonViolations(tasks);

  // Sort the reasonViolations array in descending order based on total violations
  const sortedReasonViolations = reasonViolations.sort((a, b) => b.total - a.total);

  // Prepare rows for the DataGrid
  const rows = sortedReasonViolations.map((violation, index) => ({
    id: index + 1,
    reason: violation.reason,
    totalViolations: violation.total,
    percentage: violation.percentage,
  }));

  // Calculate the net total of all violations
  const netTotal = rows.reduce((sum, row) => sum + row.totalViolations, 0);

  // Define columns for the DataGrid
  const columns = [
    {
      field: "reason",
      headerName: "Reason",
      flex: 2,
      minWidth: isMobile ? 150 : undefined // Minimum width for mobile
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
      Reason: row.reason,
      "Total Violations": row.totalViolations,
      Percentage: row.percentage,
    }));

    excelData.push({
      Reason: "Net Total",
      "Total Violations": netTotal,
      Percentage: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reason Violations");
    XLSX.writeFile(workbook, "Reason_Violations.xlsx");
  };

  return (
    <Stack justifyContent={"center"} sx={{ width: "100%" }}>
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent={"space-between"}
        alignItems={isMobile ? "flex-start" : "center"}
        sx={{
          marginBottom: "10px",
          gap: isMobile ? 1 : 0
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ color: "#ffffff", fontSize: "1rem" }}>
          Reason Overview
        </Typography>
        <Button
          variant="contained"
          size={isMobile ? "small" : "medium"}
          sx={{ backgroundColor: '#1D4ED8', py: 1, lineHeight: 1, fontSize: '0.8rem' }}
          onClick={exportToExcel}
        >
          Export CSV
        </Button>
      </Stack>
      <Paper sx={{
        height: 420,
        width: "100%",
        backgroundColor: "#272727",
        overflow: "hidden" // Prevent double scrollbars
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableVirtualization={true}
          disableColumnResize
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
      <Typography variant="body1" fontWeight="bold" sx={{ marginTop: "10px", color: "#ffffff" }}>
        Total Count: {netTotal}
      </Typography>
    </Stack>
  );
};