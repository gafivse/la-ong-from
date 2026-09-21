import test from "node:test";
import assert from "node:assert/strict";
import { formatDateInput, parseDateInput } from "../lib/date-input.js";

test("dates display day first and convert back to API format", () => {
  assert.equal(formatDateInput("2026-09-17"), "17/09/2026");
  assert.equal(parseDateInput("17/09/2026"), "2026-09-17");
  assert.equal(parseDateInput("03/04/2026"), "2026-04-03");
  assert.equal(formatDateInput(""), "");
  assert.equal(parseDateInput(""), "");
});

test("rejects impossible dates and incomplete input", () => {
  for (const value of [
    "31/04/2026",
    "29/02/2026",
    "09/17/2026",
    "17/09/20",
    "00/09/2026",
    "01/01/0000",
  ])
    assert.equal(parseDateInput(value), "", value);
  assert.equal(parseDateInput("29/02/2028"), "2028-02-29");
});
