import { describe, expect, it } from "vitest";
import { accountabilityOf, filterByAccountability, isTeamAccountable } from "../utils/accountability";
import { filterTasks } from "../pages/tasks/taskUtils";

// Shapes found in the tasks collection: arrays per RCA row, and older single strings.
const tasks = [
  { _id: "a", teamAccountability: ["Yes"] },
  { _id: "b", teamAccountability: ["No", "Yes"] },
  { _id: "c", teamAccountability: "Yes" },
  { _id: "d", teamAccountability: ["No"] },
  { _id: "e", teamAccountability: ["No", "No"] },
  { _id: "f", teamAccountability: "No" },
  { _id: "g", teamAccountability: [] },
  { _id: "h" },
];

describe("team accountability", () => {
  it("counts a ticket against the team when any RCA row says Yes", () => {
    expect(tasks.filter(isTeamAccountable).map((t) => t._id)).toEqual(["a", "b", "c"]);
  });

  it("classifies accountable / not / unset", () => {
    expect(tasks.map(accountabilityOf)).toEqual(["accountable", "accountable", "accountable", "not", "not", "not", "unset", "unset"]);
  });

  it("filters by any selected classes, empty keeps everything", () => {
    expect(filterByAccountability(tasks, ["not"]).map((t) => t._id)).toEqual(["d", "e", "f"]);
    expect(filterByAccountability(tasks, [])).toHaveLength(tasks.length);
  });

  it("is part of the Tasks page filters", () => {
    const f = { q: "", range: "all", acc: ["not", "unset"] };
    expect(filterTasks(tasks, f).map((t) => t._id)).toEqual(["d", "e", "f", "g", "h"]);
  });
});
