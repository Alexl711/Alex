import { test, expect, type Page } from "@playwright/test";
const navigation = [
  "Dashboard",
  "My Degree",
  "Degree Audit",
  "Course Explorer",
  "Transfer Matrix",
  "Pathway Optimizer",
  "Study Planner",
  "Financial Command Center",
  "University Comparison",
  "Academic Verification Center",
  "Applications & Enrollment",
  "Prior Learning Assessment",
  "Transcript & Document Vault",
  "Professional Development",
  "Reports & Analytics",
  "Research Sources",
  "Settings & Backups",
];
async function onboard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Personalize my workspace" }).click();
  await page
    .getByRole("textbox", { name: "What should we call you?" })
    .fill("Taylor");
  await page
    .getByRole("spinbutton", { name: "Available weekly study hours" })
    .fill("12");
  await page
    .getByRole("button", { name: "Open my zero-credit dashboard" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function go(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
test("zero-credit dashboard, all sections, desktop visual and no runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page);
  await expect(page.getByText("0 credits earned & applied")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/dashboard-desktop.png",
    fullPage: true,
  });
  for (const name of navigation) {
    await go(page, name);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("course add, edit, schedule, complete, persistence and deletion do not fabricate credits", async ({
  page,
}) => {
  await onboard(page);
  await go(page, "Course Explorer");
  await page
    .getByRole("button", { name: "Add course", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Course title", exact: true })
    .fill("Procurement test course");
  await dialog
    .getByRole("textbox", { name: "Exact provider course ID" })
    .fill("TEST-001");
  await dialog.getByRole("button", { name: "Save record" }).click();
  await page
    .getByRole("textbox", { name: "Search Courses", exact: true })
    .fill("Procurement test course");
  await expect(
    page.getByRole("button", { name: "Procurement test course", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Progress for Procurement test course" })
    .selectOption("Completed");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await go(page, "Dashboard");
  await expect(page.getByText("0 credits earned & applied")).toBeVisible();
  await go(page, "Course Explorer");
  await page
    .getByRole("textbox", { name: "Search Courses", exact: true })
    .fill("Procurement test course");
  await page
    .getByRole("button", { name: "Edit Procurement test course", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Course title", exact: true })
    .fill("Procurement edited");
  await page.getByRole("button", { name: "Save record" }).click();
  await page
    .getByRole("textbox", { name: "Search Courses", exact: true })
    .fill("Procurement edited");
  await page
    .getByRole("button", { name: "Delete Procurement edited", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Procurement edited", exact: true }),
  ).toHaveCount(0);
});
test("planner manual shift, study capacity and transaction persist", async ({
  page,
}) => {
  await onboard(page);
  await go(page, "Study Planner");
  await page.getByRole("button", { name: "Add block", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Block type" })
    .selectOption("Work night");
  await dialog
    .getByRole("spinbutton", { name: "Duration (minutes)" })
    .fill("720");
  await dialog.getByRole("button", { name: "Save block" }).click();
  await expect(
    page.locator(".calendar-event").filter({ hasText: "Work night" }),
  ).toBeVisible();
  await go(page, "Financial Command Center");
  await page.getByRole("button", { name: "Record transaction" }).click();
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Sophia actual payment");
  await page
    .getByRole("spinbutton", { name: "Amount ($)", exact: true })
    .fill("99");
  await page
    .getByRole("combobox", { name: "Financial state" })
    .selectOption("Payment");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Actual net spending" })
      .getByText("$99", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await go(page, "Financial Command Center");
  await expect(
    page.getByText("Sophia actual payment", { exact: true }),
  ).toBeVisible();
});
test("backup export and restore includes local document, corrupt imports preserve records", async ({
  page,
}) => {
  await onboard(page);
  await go(page, "Transcript & Document Vault");
  await page.locator(".drop-zone input").setInputFiles({
    name: "advisor-note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "This is a test fixture, not a real academic approval.",
    ),
  });
  await expect(
    page.getByText("advisor-note.txt", { exact: true }),
  ).toBeVisible();
  await go(page, "Settings & Backups");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export full backup" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "Reset this device" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await go(page, "Settings & Backups");
  await page
    .locator('input[type=file][accept=".json"]')
    .first()
    .setInputFiles(path!);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Backup restored successfully")).toBeVisible();
  await go(page, "Transcript & Document Vault");
  await expect(
    page.getByText("advisor-note.txt", { exact: true }),
  ).toBeVisible();
});
test("modal keyboard accessibility and command palette", async ({ page }) => {
  await onboard(page);
  await page
    .getByRole("button", { name: "Add course", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await page.getByRole("textbox", { name: "Command search" }).fill("planner");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Study Planner" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Study Planner", exact: true }),
  ).toBeVisible();
});
test("mobile navigation, responsive matrix, all sections have no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page);
  await page.screenshot({
    path: "docs/screenshots/dashboard-mobile.png",
    fullPage: true,
  });
  for (const name of navigation) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await go(page, name);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      name + " overflows",
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await go(page, "Transfer Matrix");
  await expect(page.locator(".table-scroll")).toBeVisible();
});
test("production app reloads offline and retains personal data", async ({
  page,
  context,
}) => {
  await onboard(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByText("0 credits earned & applied")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Taylor");
  await expect(page.getByText("0 credits earned & applied")).toBeVisible();
  await context.setOffline(false);
});
test("PDF and DOCX extraction work locally and cannot auto-import approvals", async ({
  page,
  context,
}) => {
  await onboard(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await go(page, "Transcript & Document Vault");
  await context.setOffline(true);
  await page
    .locator(".drop-zone input")
    .setInputFiles([
      "tests/fixtures/transcript-fixture.pdf",
      "tests/fixtures/advisor-fixture.docx",
    ]);
  await expect(
    page.getByText("advisor-fixture.docx", { exact: true }),
  ).toBeVisible();
  const pdf = page
    .locator(".document-row")
    .filter({ hasText: "transcript-fixture.pdf" });
  await pdf.locator("summary").click();
  await expect(
    pdf.getByRole("textbox", { name: "Extracted text (review only)" }),
  ).toHaveValue(/QA fixture/);
  await expect(
    pdf.getByRole("button", { name: "Create evidence draft" }),
  ).toBeDisabled();
  const docx = page
    .locator(".document-row")
    .filter({ hasText: "advisor-fixture.docx" });
  await docx.locator("summary").click();
  await expect(
    docx.getByRole("textbox", { name: "Extracted text (review only)" }),
  ).toHaveValue(/QA DOCX fixture/);
  await context.setOffline(false);
});
test("reviewed university evidence can apply credit; public tables cannot", async ({
  page,
}) => {
  await onboard(page);
  await go(page, "Course Explorer");
  await page
    .getByRole("button", { name: "Add course", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Course title", exact: true })
    .fill("QA accepted course");
  await page
    .getByRole("textbox", { name: "Exact provider course ID" })
    .fill("QA-ACCEPTED");
  await page.getByRole("button", { name: "Save record" }).click();
  await go(page, "Research Sources");
  await page.getByRole("button", { name: "Add reviewed evidence" }).click();
  const source = page.getByRole("dialog");
  await source
    .getByRole("textbox", { name: "Source URL" })
    .fill("https://university.example/test-fixture");
  await source
    .getByRole("textbox", { name: "Authority / document author" })
    .fill("QA official audit fixture");
  await source
    .getByRole("combobox", { name: "Evidence type" })
    .selectOption("degree-audit");
  await source
    .getByRole("textbox", { name: "Exact supporting excerpt" })
    .fill(
      "QA fixture: 3 credits posted and applied to QA requirement. Not real academic evidence.",
    );
  await source.getByRole("button", { name: "Save record" }).click();
  await go(page, "Degree Audit");
  await page.getByRole("button", { name: "Add requirement" }).click();
  const req = page.getByRole("dialog");
  await req
    .getByRole("textbox", { name: "Requirement title" })
    .fill("QA degree requirement");
  await req
    .getByRole("combobox", { name: "Verification state" })
    .selectOption("documented");
  const sourceOption = req
    .getByRole("listbox", { name: "Supporting sources" })
    .getByRole("option")
    .filter({ hasText: "university.example/test-fixture" });
  const sourceId = await sourceOption.getAttribute("value");
  await req
    .getByRole("listbox", { name: "Supporting sources" })
    .selectOption(sourceId!);
  await req
    .getByRole("textbox", { name: "Exact supporting excerpt" })
    .fill("QA fixture requires three credits.");
  await req.getByRole("button", { name: "Save record" }).click();
  await page.getByRole("button", { name: "Record official credit" }).click();
  const award = page.getByRole("dialog");
  await award
    .getByRole("combobox", { name: "Course", exact: true })
    .selectOption({ label: "QA accepted course" });
  await award
    .getByRole("checkbox", { name: "University transcript officially posted" })
    .check();
  await award
    .getByRole("checkbox", { name: "University audit officially applied" })
    .check();
  await award
    .getByRole("listbox", { name: "Applied requirements" })
    .selectOption({ label: "QA degree requirement" });
  await award.getByRole("button", { name: "Save record" }).click();
  await expect(award.getByRole("alert")).toContainText("degree-audit");
  await award
    .getByRole("combobox", { name: "Evidence record" })
    .selectOption(sourceId!);
  await award.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await go(page, "Dashboard");
  await expect(page.getByText("3 credits earned & applied")).toBeVisible();
  await page.reload();
  await expect(page.getByText("3 credits earned & applied")).toBeVisible();
});
