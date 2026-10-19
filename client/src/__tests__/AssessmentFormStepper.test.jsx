import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";
import appTheme from "../theme/appTheme";
import AssessmentForm from "../components/AssessmentForm";

const CATEGORIES = ["Splicing & Testing Equipment", "Fiber Optic Splicing Skills", "ONT Placement, Configuration and testing", "Customer Education", "Customer Service Skills"];
const checkPoints = CATEGORIES.map((category, i) => ({ name: `Check ${i + 1}`, description: "", category, isCompleted: false, score: 0, notes: "" }));
const colors = { textPrimary: "#111", textSecondary: "#555", border: "#ddd", primary: "#6C47FF", surface: "#fff", success: "#16A34A", warning: "#D97706", error: "#DC2626" };
const store = configureStore({ reducer: { auth: () => ({ user: { _id: "u1", name: "Ammar" } }) } });

const renderForm = (onSubmit = vi.fn()) =>
  render(
    <Provider store={store}>
      <ThemeProvider theme={appTheme}>
        <AssessmentForm
          initialAssessment={{ feedback: "", checkPoints }}
          loading={false}
          colors={colors}
          onSubmit={onSubmit}
          calculateOverallScore={(pts) => Math.round((pts.reduce((n, p) => n + (p.score || 0), 0) / (pts.length * 5)) * 100)}
          getPerformanceColor={() => "success"}
          editMode={false}
          onCancel={() => {}}
          getScoreLabel={() => ""}
          isMobile={false}
        />
      </ThemeProvider>
    </Provider>
  );

describe("On-the-job AssessmentForm stepper", () => {
  it("shows one category per step and reaches review with the submit button", () => {
    renderForm();
    expect(screen.getByText("Check 1")).toBeInTheDocument();
    expect(screen.queryByText("Check 2")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByText("Check 2")).toBeInTheDocument();
    expect(screen.queryByText("Check 1")).not.toBeInTheDocument();

    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: /^(Next|Review)/ }));
    expect(screen.getByText("Check 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Review/ }));

    expect(screen.getByText("Final Observations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalize Assessment/ })).toBeDisabled(); // feedback still empty
    expect(screen.queryByText("Check 5")).not.toBeInTheDocument();
  }, 30000);

  it("lets the step rail jump straight to a category", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /Customer Education/ }));
    expect(screen.getByText("Check 4")).toBeInTheDocument();
  }, 30000);
});
