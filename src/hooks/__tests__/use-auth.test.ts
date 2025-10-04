import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "../use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useRouter } from "next/navigation";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with isLoading as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });

    it("should provide signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    it("should set isLoading to true while signing in", async () => {
      vi.mocked(signInAction).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: false, error: "Error" }), 100)
          )
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should call signInAction with correct credentials", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    it("should return error result when sign in fails", async () => {
      const errorResult = { success: false as const, error: "Invalid credentials" };
      vi.mocked(signInAction).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.signIn("test@example.com", "wrong");
      });

      expect(returnValue).toEqual(errorResult);
    });

    it("should set isLoading to false after sign in fails", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should navigate to new project with anonymous work on success", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/test.js": { type: "file", content: "test" } },
      };
      const mockProject = { id: "anon-project-123" };

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork as any);
      vi.mocked(createProject).mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-123");
    });

    it("should navigate to most recent project when no anonymous work", async () => {
      const mockProjects = [
        { id: "project-1", name: "Project 1" },
        { id: "project-2", name: "Project 2" },
      ];

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue(mockProjects as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-1");
      expect(createProject).not.toHaveBeenCalled();
    });

    it("should create new project when user has no existing projects", async () => {
      const mockNewProject = { id: "new-project-456" };

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue(mockNewProject as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-456");
    });

    it("should not navigate if sign in fails", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(getAnonWorkData).not.toHaveBeenCalled();
    });

    it("should ignore empty anonymous work messages", async () => {
      const mockProjects = [{ id: "project-1", name: "Project 1" }];
      const emptyAnonWork = {
        messages: [],
        fileSystemData: {},
      };

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(emptyAnonWork as any);
      vi.mocked(getProjects).mockResolvedValue(mockProjects as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });
  });

  describe("signUp", () => {
    it("should set isLoading to true while signing up", async () => {
      vi.mocked(signUpAction).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: false, error: "Error" }), 100)
          )
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should call signUpAction with correct credentials", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "securepass123");
      });

      expect(signUpAction).toHaveBeenCalledWith(
        "newuser@example.com",
        "securepass123"
      );
    });

    it("should return error result when sign up fails", async () => {
      const errorResult = {
        success: false as const,
        error: "Email already exists",
      };
      vi.mocked(signUpAction).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.signUp(
          "existing@example.com",
          "password"
        );
      });

      expect(returnValue).toEqual(errorResult);
    });

    it("should set isLoading to false after sign up fails", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("test@example.com", "password");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should navigate to new project with anonymous work on success", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Create a button" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "..." } },
      };
      const mockProject = { id: "signup-project-789" };

      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork as any);
      vi.mocked(createProject).mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-project-789");
    });

    it("should create new project when signing up with no projects", async () => {
      const mockNewProject = { id: "first-project-999" };

      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue(mockNewProject as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/first-project-999");
    });

    it("should not navigate if sign up fails", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Validation error",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("invalid@example.com", "short");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(getAnonWorkData).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should reset isLoading even if signIn throws an error", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password");
        } catch {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading even if signUp throws an error", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("test@example.com", "password");
        } catch {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading if post-signin navigation fails", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockRejectedValue(new Error("DB error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password");
        } catch {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should reset isLoading if createProject fails", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("test@example.com", "password");
        } catch {
          // Expected error
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple simultaneous signIn calls", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await Promise.all([
          result.current.signIn("test@example.com", "password"),
          result.current.signIn("test@example.com", "password"),
        ]);
      });

      expect(signInAction).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle random project name generation", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "test-id" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      const projectCall = vi.mocked(createProject).mock.calls[0][0];
      expect(projectCall.name).toMatch(/^New Design #\d+$/);
      const randomNum = parseInt(projectCall.name.replace("New Design #", ""));
      expect(randomNum).toBeGreaterThanOrEqual(0);
      expect(randomNum).toBeLessThan(100000);
    });

    it("should format timestamp correctly for anonymous work project name", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "test" }],
        fileSystemData: {},
      };

      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork as any);
      vi.mocked(createProject).mockResolvedValue({ id: "test-id" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("test@example.com", "password");
      });

      const projectCall = vi.mocked(createProject).mock.calls[0][0];
      expect(projectCall.name).toMatch(/^Design from \d{1,2}:\d{2}:\d{2}/);
    });
  });
});
