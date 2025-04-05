import { Paper, Stack, Typography, Button, useMediaQuery } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
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
      };
    }

    if (evaluationScore >= 1 && evaluationScore <= 6) {
      companyViolations[teamCompany].total += 1;
    } else if (evaluationScore >= 7 && evaluationScore <= 8) {
      companyViolations[teamCompany].total += 1;
    }
  });

  // Calculate total violations across all companies
  const totalViolations = Object.values(companyViolations).reduce((sum, violations) => sum + violations.total, 0);

  // Convert to array and add percentage
  return Object.entries(companyViolations).map(([company, violations]) => ({
    company,
    total: violations.total,
    percentage: ((violations.total / totalViolations) * 100).toFixed(2) + "%",
  }));
};

export const CompanyViolationTable = ({ tasks }) => {
  const isMobile = useMediaQuery('(max-width:503px)');

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
  }));

  // Calculate the net total of all violations
  const netTotal = rows.reduce((sum, row) => sum + row.totalViolations, 0);

  // Define columns for the DataGrid
  const columns = [
    {
      field: "company",
      headerName: "Company",
      flex: 2,
      minWidth: isMobile ? 150 : undefined // Ensure minimum width on mobile
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Company Violations");
    XLSX.writeFile(workbook, "Company_Violations.xlsx");
  };

  return (
    <Stack justifyContent={"center"} sx={{ width: "100%" }}>
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent={"space-between"}
        alignItems={isMobile ? "flex-start" : "center"}
        sx={{ marginBottom: "10px", gap: isMobile ? 1 : 0 }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ color: "#ffffff", fontSize: "1rem" }}>
          Company Violations Overview
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