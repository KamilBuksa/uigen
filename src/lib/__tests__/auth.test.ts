import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSession, getSession } from "../auth";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

vi.mock("next/headers");
vi.mock("jose");

describe("createSession", () => {
  const mockCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  const mockSign = vi.fn();
  const mockJWT = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    vi.mocked(SignJWT).mockReturnValue(mockJWT as any);
    mockSign.mockResolvedValue("mock-jwt-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a session with correct userId and email", async () => {
    const userId = "user-123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email,
        expiresAt: expect.any(Date),
      })
    );
  });

  it("should set expiration to 7 days from now", async () => {
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    await createSession("user-123", "test@example.com");

    const callArgs = vi.mocked(SignJWT).mock.calls[0][0] as any;
    const expiresAt = callArgs.expiresAt.getTime();

    expect(expiresAt).toBeGreaterThanOrEqual(now + sevenDaysInMs - 1000);
    expect(expiresAt).toBeLessThanOrEqual(now + sevenDaysInMs + 1000);
  });

  it("should configure JWT with HS256 algorithm", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockJWT.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  });

  it("should set JWT expiration time to 7 days", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockJWT.setExpirationTime).toHaveBeenCalledWith("7d");
  });

  it("should set JWT issued at time", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockJWT.setIssuedAt).toHaveBeenCalled();
  });

  it("should set httpOnly cookie with correct name and token", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mock-jwt-token",
      expect.any(Object)
    );
  });

  it("should set cookie with httpOnly flag", async () => {
    await createSession("user-123", "test@example.com");

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.httpOnly).toBe(true);
  });

  it("should set cookie with sameSite lax", async () => {
    await createSession("user-123", "test@example.com");

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.sameSite).toBe("lax");
  });

  it("should set cookie path to /", async () => {
    await createSession("user-123", "test@example.com");

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.path).toBe("/");
  });

  it("should set cookie expires to match session expiration", async () => {
    await createSession("user-123", "test@example.com");

    const sessionPayload = vi.mocked(SignJWT).mock.calls[0][0] as any;
    const cookieOptions = mockCookieStore.set.mock.calls[0][2];

    expect(cookieOptions.expires).toEqual(sessionPayload.expiresAt);
  });

  it("should set secure flag in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    await createSession("user-123", "test@example.com");

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.secure).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it("should not set secure flag in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    await createSession("user-123", "test@example.com");

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.secure).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });
});

describe("getSession", () => {
  const mockCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return null when no auth token cookie exists", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
    expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
  });

  it("should return null when auth token cookie has no value", async () => {
    mockCookieStore.get.mockReturnValue({});

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("should return session payload when token is valid", async () => {
    const mockPayload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date("2025-12-31"),
    };

    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: mockPayload,
    } as any);

    const session = await getSession();

    expect(session).toEqual(mockPayload);
    expect(jwtVerify).toHaveBeenCalledWith(
      "valid-token",
      expect.any(Uint8Array)
    );
  });

  it("should return null when JWT verification fails", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid token"));

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("should return null when JWT is expired", async () => {
    mockCookieStore.get.mockReturnValue({ value: "expired-token" });
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Token expired"));

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("should return null when JWT has invalid signature", async () => {
    mockCookieStore.get.mockReturnValue({ value: "tampered-token" });
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Signature verification failed"));

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("should extract userId from valid token", async () => {
    const mockPayload = {
      userId: "user-456",
      email: "user@example.com",
      expiresAt: new Date(),
    };

    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload } as any);

    const session = await getSession();

    expect(session?.userId).toBe("user-456");
  });

  it("should extract email from valid token", async () => {
    const mockPayload = {
      userId: "user-789",
      email: "another@example.com",
      expiresAt: new Date(),
    };

    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload } as any);

    const session = await getSession();

    expect(session?.email).toBe("another@example.com");
  });
});
