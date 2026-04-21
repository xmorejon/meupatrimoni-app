import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useDashboardData } from "./useDashboardData"; // Import the actual hook
import { getDashboardData } from "@/lib/firebase-service";
import { User } from "firebase/auth";
import { demoData } from "@/lib/demo-data"; // Import actual demo data

declare const jest: any;

// Mock the firebase-service module
jest.mock("@/lib/firebase-service", () => ({
  getDashboardData: jest.fn(),
}));

// Cast to a mock so we can use mockResolvedValue etc.
const mockedGetDashboardData = getDashboardData as any;

const mockUser = { uid: "test-user-id" } as User;

describe("useDashboardData", () => {
  beforeEach(() => {
    // Clear mock history and implementations before each test
    mockedGetDashboardData.mockClear();
  });

  it("should not fetch data if there is no user", () => {
    const { result } = renderHook(() => useDashboardData(null));

    expect(result.current.data).toBeNull();
    expect(result.current.isFetching).toBe(false);
    expect(mockedGetDashboardData).not.toHaveBeenCalled();
  });

  it("should not fetch data if user is undefined (still loading auth state)", () => {
    const { result } = renderHook(() => useDashboardData(undefined));

    expect(result.current.data).toBeNull();
    expect(result.current.isFetching).toBe(false);
    expect(mockedGetDashboardData).not.toHaveBeenCalled();
  });

  it("should fetch data successfully and update state", async () => {
    mockedGetDashboardData.mockResolvedValue(demoData as never);
    
    const { result } = renderHook(() => useDashboardData(mockUser));

    // The initial render will set isFetching to true
    expect(result.current.isFetching).toBe(true);

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toEqual(demoData);
    expect(result.current.error).toBeNull();
    expect(mockedGetDashboardData).toHaveBeenCalledWith(mockUser.uid);
  });

  it("should handle errors during data fetching", async () => {
    const errorMessage = "Failed to load dashboard data.";
    mockedGetDashboardData.mockRejectedValue(new Error("API Error") as never);

    // Silence the expected console.error just for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useDashboardData(mockUser));

    expect(result.current.isFetching).toBe(true);

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(errorMessage);
    expect(mockedGetDashboardData).toHaveBeenCalledWith(mockUser.uid);

    // Clean up the spy
    consoleSpy.mockRestore();
  });

  it("should reset data when user becomes null", async () => {
    mockedGetDashboardData.mockResolvedValue(demoData as never);

    const { result, rerender } = renderHook(
      ({ user }) => useDashboardData(user),
      {
        initialProps: { user: mockUser as User | null },
      },
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    
    expect(result.current.data).toEqual(demoData);

    rerender({ user: null });

    expect(result.current.data).toBeNull();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
