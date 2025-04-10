import { Paper, Stack, Typography, Button, useMediaQuery, IconButton, Tooltip } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { getActivationTeamValidationData } from "../utils/helpers";
import { RiFileExcel2Fill } from "react-icons/ri";

const prepareValidationTableData = (validationPercentages) => {
  return validationPercentages.map((item, index) => ({
    id: index + 1,
    validationCat: item.validationCat,
    percentage: `${item.percentage}%`,
    count: item.count,
  }));
};

export const ActivationTeamRespTable = ({ tasks }) => {
  const isMobile = useMediaQuery('(max-width:503px)');
  const validationPercentages = getActivationTeamValidationData(tasks);
  const rows = prepareValidationTableData(validationPercentages);

  // Calculate the net total of all counts
  const netTotal = rows.reduce((sum, row) => sum + row.count, 0);

  const columns = [
    {
      field: "validationCat",
      headerName: "Validation Category",
      flex: 2,
      minWidth: isMobile ? 150 : undefined
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

  // Function to export table data to Excel
  const exportToExcel = () => {
    const excelData = rows.map((row) => ({
      "Validation Category": row.validationCat,
      Count: row.count,
      Percentage: row.percentage,
    }));

    excelData.push({
      "Validation Category": "Net Total",
      Count: netTotal,
      Percentage: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Validation Categories");
    XLSX.writeFile(workbook, "Validation_Categories.xlsx");
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
          fontWeight="bold"
          sx={{
            color: "#ffffff",
            fontSize: isMobile ? "0.9rem" : "1rem",
          }}
        >
          Activation Team Validation Categories
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
        overflow: "hidden"
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          disableColumnResize
          disableVirtualization={true}
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