import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useDashboardData } from "./useDashboardData"; // Import the actual hook
import { getDashboardData } from "@/lib/firebase-service";
import { User } from "firebase/auth";

// Mock the firebase-service module
jest.mock("@/lib/firebase-service", () => ({
  getDashboardData: jest.fn(),
}));

// Create a typed mock for getDashboardData
const mockedGetDashboardData = getDashboardData as jest.Mock;

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

  it("should fetch data successfully and update state", async () => {
    const mockData = { netWorth: 1000 };
    mockedGetDashboardData.mockResolvedValue(mockData as never);

    const { result } = renderHook(() => useDashboardData(mockUser));

    // Initial state should be fetching
    expect(result.current.isFetching).toBe(true);

    // Wait for the hook to finish fetching and update its state
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    // Final state should reflect successful fetch
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockedGetDashboardData).toHaveBeenCalledWith(mockUser.uid);
    expect(mockedGetDashboardData).toHaveBeenCalledTimes(1);
  });

  it("should handle errors during data fetching", async () => {
    const errorMessage = "Failed to load dashboard data.";
    mockedGetDashboardData.mockRejectedValue(new Error("API Error") as never);

    const { result } = renderHook(() => useDashboardData(mockUser));

    // Initial state should be fetching
    expect(result.current.isFetching).toBe(true);

    // Wait for the hook to finish fetching and update its state
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    // Final state should reflect the error
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(errorMessage);
    expect(mockedGetDashboardData).toHaveBeenCalledWith(mockUser.uid);
    expect(mockedGetDashboardData).toHaveBeenCalledTimes(1);
  });

  it("should reset data when user becomes null", async () => {
    const mockData = { netWorth: 1000 };
    mockedGetDashboardData.mockResolvedValue(mockData as never);

    const { result, rerender } = renderHook(
      ({ user }) => useDashboardData(user),
      {
        // The props for the hook's render function
        initialProps: { user: mockUser as User | null },
      }
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.data).toEqual(mockData);

    rerender({ user: null });

    expect(result.current.data).toBeNull();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
