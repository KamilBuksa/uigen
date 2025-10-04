import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

test("formats str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("formats str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/components/Card.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("formats str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/utils/helpers.js" }}
      state="result"
    />
  );
  expect(screen.getByText("Editing /utils/helpers.js")).toBeDefined();
});

test("formats str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/test.js" }}
      state="result"
    />
  );
  expect(screen.getByText("Viewing /test.js")).toBeDefined();
});

test("formats file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/old.js", new_path: "/new.js" }}
      state="result"
    />
  );
  expect(screen.getByText("Renaming /old.js → /new.js")).toBeDefined();
});

test("formats file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/test.js" }}
      state="result"
    />
  );
  expect(screen.getByText("Deleting /test.js")).toBeDefined();
});

test("shows loading state with spinner", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="loading"
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows completed state with green dot", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("handles missing args by showing tool name", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      state="result"
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("handles unknown tool by showing tool name", () => {
  render(
    <ToolInvocationBadge
      toolName="unknown_tool"
      args={{ some: "data" }}
      state="result"
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("handles unknown command by showing tool name", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "unknown", path: "/test.js" }}
      state="result"
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});
