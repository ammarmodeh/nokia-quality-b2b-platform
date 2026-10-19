import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";
import appTheme from "../theme/appTheme";

const tasks = Array.from({ length: 30 }, (_, i) => ({
  _id: `t${i}`,
  slid: `INT${1000 + i}`,
  requestNumber: 5000 + i,
  customerName: `Customer ${i}`,
  status: ["Todo", "In Progress", "Closed", "Completed"][i % 4],
  priority: ["High", "Medium", "Low", "Not specified"][i % 4],
  evaluationScore: (i % 9) + 1,
  teamName: `Team ${i % 3}`,
  assignedTo: [{ _id: "u1", name: "Ammar Odeh" }],
  interviewDate: new Date(2026, 9, (i % 28) + 1).toISOString(),
  createdAt: new Date(2026, 9, 1).toISOString(),
  tickets: [],
}));

vi.mock("../api/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes("get-all-tasks")) return Promise.resolve({ data: tasks });
      if (url.includes("get-all-users")) return Promise.resolve({ data: [{ _id: "u1", name: "Ammar Odeh", email: "a@x.com" }] });
      return Promise.resolve({ data: [] });
    }),
    put: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

import TasksPage from "../pages/tasks/TasksPage";

const store = configureStore({ reducer: { auth: () => ({ user: { _id: "u1", name: "Ammar Odeh", role: "Admin" } }) } });

const renderAt = (url) =>
  render(
    <Provider store={store}>
      <ThemeProvider theme={appTheme}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/tasks-list" element={<TasksPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe("TasksPage", () => {
  for (const view of ["board", "table", "calendar"]) {
    it(`renders the ${view} view without looping`, async () => {
      renderAt(`/tasks-list?view=${view}`);
      await waitFor(() => expect(screen.getByText(/of 30 tasks/)).toBeInTheDocument(), { timeout: 5000 });
    }, 15000);
  }
});
