import { Paper, Stack, Typography, Button, useMediaQuery } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';

const getResponsibilityViolations = (tasks) => {
  const responsibilityViolations = {};

  // Group violations by responsibility
  tasks.forEach((task) => {
    const { responsibility, evaluationScore } = task;

    if (!responsibility) return;

    if (!responsibilityViolations[responsibility]) {
      responsibilityViolations[responsibility] = { total: 0 };
    }

    if (evaluationScore >= 1 && evaluationScore <= 8) {
      responsibilityViolations[responsibility].total += 1;
    }
  });

  const totalViolations = Object.values(responsibilityViolations).reduce((sum, violations) => sum + violations.total, 0);

  return Object.entries(responsibilityViolations).map(([responsibility, violations]) => ({
    responsibility,
    total: violations.total,
    percentage: ((violations.total / totalViolations) * 100).toFixed(2) + "%",
  }));
};

export const AllResponsiblesTable = ({ tasks }) => {
  const isMobile = useMediaQuery('(max-width:503px)');
  const responsibilityViolations = getResponsibilityViolations(tasks);
  const sortedResponsibilityViolations = responsibilityViolations.sort((a, b) => b.total - a.total);

  const rows = sortedResponsibilityViolations.map((violation, index) => ({
    id: index + 1,
    responsibility: violation.responsibility,
    totalViolations: violation.total,
    percentage: violation.percentage,
  }));

  const netTotal = rows.reduce((sum, row) => sum + row.totalViolations, 0);

  const columns = [
    {
      field: "responsibility",
      headerName: "Responsibility",
      flex: 2,
      minWidth: isMobile ? 150 : undefined
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

  const exportToExcel = () => {
    const excelData = rows.map((row) => ({
      Responsibility: row.responsibility,
      "Total Violations": row.totalViolations,
      Percentage: row.percentage,
    }));

    excelData.push({
      Responsibility: "Net Total",
      "Total Violations": netTotal,
      Percentage: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responsibility Violations");
    XLSX.writeFile(workbook, "Responsibility_Violations.xlsx");
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
          Responsibility Overview
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
        overflow: "hidden"
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