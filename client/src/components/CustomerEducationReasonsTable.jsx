import { Paper, Stack, Typography, Button, useMediaQuery } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { getCustomerEducationReasons } from "../utils/helpers";

export const CustomerEducationReasonsTable = ({ tasks }) => {
  const isMobile = useMediaQuery('(max-width:503px)');
  const customerEducationReasons = getCustomerEducationReasons(tasks);

  const rows = customerEducationReasons.map((item, index) => ({
    id: index + 1,
    reason: item.reason,
    count: item.count,
    percentage: item.percentage,
  }));

  const netTotal = rows.reduce((sum, row) => sum + row.count, 0);

  const columns = [
    {
      field: "reason",
      headerName: "Reason",
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Education Reasons");
    XLSX.writeFile(workbook, "Customer_Education_Reasons.xlsx");
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
          Customer Education Reasons
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
        overflow: "hidden"
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          disableColumnResize
          pageSizeOptions={[5, 10, 25]}
          disableVirtualization={true}
          sx={{
            border: 0,
            color: "#ffffff",
            "& .MuiDataGrid-main": {
              backgroundColor: "#272727",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#333",
              color: "#9e9e9e",
              fontSize: "0.875rem",
              fontWeight: "bold",
              borderBottom: "1px solid #444",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#333",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #444",
            },
            "& .MuiDataGrid-row": {
              backgroundColor: "#272727",
              "&:hover": {
                backgroundColor: "#333",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              minHeight: "64px",
              backgroundColor: "#333",
              color: "#ffffff",
              borderTop: "1px solid #444",
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