import {
  getMockSegmentFilters,
  mockEnvironmentId,
  mockEvaluateSegmentUserData,
  mockSegment,
  mockSegmentCreateInput,
  mockSegmentId,
  mockSegmentPrisma,
  mockSegmentUpdateInput,
  mockSurveyId,
} from "./__mocks__/segment.mock";

import { Prisma } from "@prisma/client";

import { prismaMock } from "@formbricks/database/src/jestClient";
import { DatabaseError, ResourceNotFoundError } from "@formbricks/types/errors";

import { testInputValidation } from "../../jest/jestSetup";
import {
  cloneSegment,
  createSegment,
  deleteSegment,
  evaluateSegment,
  getSegment,
  getSegments,
  updateSegment,
} from "../service";

function addOrSubractDays(date: Date, number: number) {
  return new Date(new Date().setDate(date.getDate() - number));
}

beforeEach(() => {
  prismaMock.segment.findUnique.mockResolvedValue(mockSegmentPrisma);
  prismaMock.segment.findMany.mockResolvedValue([mockSegmentPrisma]);
  prismaMock.segment.update.mockResolvedValue({
    ...mockSegmentPrisma,
    filters: getMockSegmentFilters("lastMonthCount", 5, "greaterEqual"),
  });
});

describe("Tests for evaluateSegment service", () => {
  describe("Happy Path", () => {
    it("Returns true when the user meets the segment criteria", async () => {
      prismaMock.action.count.mockResolvedValue(4);
      const result = await evaluateSegment(
        mockEvaluateSegmentUserData,
        getMockSegmentFilters("lastQuarterCount", 5, "lessThan")
      );
      expect(result).toBe(true);
    });

    it("Calculates the action count for the last month", async () => {
      prismaMock.action.count.mockResolvedValue(0);
      const result = await evaluateSegment(
        mockEvaluateSegmentUserData,
        getMockSegmentFilters("lastMonthCount", 5, "lessThan")
      );
      expect(result).toBe(true);
    });

    it("Calculates the action count for the last week", async () => {
      prismaMock.action.count.mockResolvedValue(6);
      const result = await evaluateSegment(
        mockEvaluateSegmentUserData,
        getMockSegmentFilters("lastWeekCount", 5, "greaterEqual")
      );
      expect(result).toBe(true);
    });

    it("Calculates the total occurences of action", async () => {
      prismaMock.action.count.mockResolvedValue(6);
      const result = await evaluateSegment(
        mockEvaluateSegmentUserData,
        getMockSegmentFilters("occuranceCount", 5, "greaterEqual")
      );
      expect(result).toBe(true);
    });

    it("Calculates the last occurence days ago of action", async () => {
      prismaMock.action.findFirst.mockResolvedValue({ createdAt: addOrSubractDays(new Date(), 5) } as any);

      const result = await evaluateSegment(
        mockEvaluateSegmentUserData,
        getMockSegmentFilters("lastOccurranceDaysAgo", 0, "greaterEqual")
      );
      expect(result).toBe(true);
    });

    it("Calculates the first occurence days ago of action", async () => {
      prismaMock.action.findFirst.mockResolvedValue({ createdAt: addOrSubractDays(new Date(), 5) } as any);

      const result = await evaluateSegment(
        mockEvaluateSegmentUserData,
        getMockSegmentFilters("firstOccurranceDaysAgo", 6, "lessThan")
      );
      expect(result).toBe(true);
    });
  });

  describe("Sad Path", () => {
    it("Returns false when the user does not meet the segment criteria", async () => {
      prismaMock.action.count.mockResolvedValue(0);
      const result = await evaluateSegment(
        mockEvaluateSegmentUserData,
        getMockSegmentFilters("lastQuarterCount", 5, "greaterThan")
      );
      expect(result).toBe(false);
    });
  });
});

describe("Tests for createSegment service", () => {
  describe("Happy Path", () => {
    it("Creates a new user segment", async () => {
      prismaMock.segment.create.mockResolvedValue(mockSegmentPrisma);
      const result = await createSegment(mockSegmentCreateInput);
      expect(result).toEqual(mockSegment);
    });
  });

  describe("Sad Path", () => {
    testInputValidation(createSegment, { ...mockSegmentCreateInput, title: undefined });

    it("Throws a DatabaseError error if there is a PrismaClientKnownRequestError", async () => {
      const mockErrorMessage = "Mock error message";
      const errToThrow = new Prisma.PrismaClientKnownRequestError(mockErrorMessage, {
        code: "P2002",
        clientVersion: "0.0.1",
      });

      prismaMock.segment.create.mockRejectedValue(errToThrow);

      await expect(createSegment(mockSegmentCreateInput)).rejects.toThrow(DatabaseError);
    });

    it("Throws a generic Error for unexpected exceptions", async () => {
      const mockErrorMessage = "Mock error message";
      prismaMock.segment.create.mockRejectedValue(new Error(mockErrorMessage));

      await expect(createSegment(mockSegmentCreateInput)).rejects.toThrow(Error);
    });
  });
});

describe("Tests for getSegments service", () => {
  describe("Happy Path", () => {
    it("Returns all user segments", async () => {
      const result = await getSegments(mockEnvironmentId);
      expect(result).toEqual([mockSegment]);
    });
  });

  describe("Sad Path", () => {
    testInputValidation(getSegments, "123");

    it("Throws a DatabaseError error if there is a PrismaClientKnownRequestError", async () => {
      const mockErrorMessage = "Mock error message";
      const errToThrow = new Prisma.PrismaClientKnownRequestError(mockErrorMessage, {
        code: "P2002",
        clientVersion: "0.0.1",
      });

      prismaMock.segment.findMany.mockRejectedValue(errToThrow);

      await expect(getSegments(mockEnvironmentId)).rejects.toThrow(DatabaseError);
    });

    it("Throws a generic Error for unexpected exceptions", async () => {
      const mockErrorMessage = "Mock error message";
      prismaMock.segment.findMany.mockRejectedValue(new Error(mockErrorMessage));

      await expect(getSegments(mockEnvironmentId)).rejects.toThrow(Error);
    });
  });
});

describe("Tests for getSegment service", () => {
  describe("Happy Path", () => {
    it("Returns a user segment", async () => {
      const result = await getSegment(mockSegmentId);
      expect(result).toEqual(mockSegment);
    });
  });

  describe("Sad Path", () => {
    testInputValidation(getSegment, "123");

    it("Throws a ResourceNotFoundError error if the user segment does not exist", async () => {
      prismaMock.segment.findUnique.mockResolvedValue(null);
      await expect(getSegment(mockSegmentId)).rejects.toThrow(ResourceNotFoundError);
    });

    it("Throws a DatabaseError error if there is a PrismaClientKnownRequestError", async () => {
      const mockErrorMessage = "Mock error message";
      const errToThrow = new Prisma.PrismaClientKnownRequestError(mockErrorMessage, {
        code: "P2002",
        clientVersion: "0.0.1",
      });

      prismaMock.segment.findUnique.mockRejectedValue(errToThrow);

      await expect(getSegment(mockSegmentId)).rejects.toThrow(DatabaseError);
    });

    it("Throws a generic Error for unexpected exceptions", async () => {
      const mockErrorMessage = "Mock error message";
      prismaMock.segment.findUnique.mockRejectedValue(new Error(mockErrorMessage));

      await expect(getSegment(mockSegmentId)).rejects.toThrow(Error);
    });
  });
});

describe("Tests for updateSegment service", () => {
  describe("Happy Path", () => {
    it("Updates a user segment", async () => {
      const result = await updateSegment(mockSegmentId, mockSegmentUpdateInput);
      expect(result).toEqual({
        ...mockSegment,
        filters: getMockSegmentFilters("lastMonthCount", 5, "greaterEqual"),
      });
    });
  });

  describe("Sad Path", () => {
    testInputValidation(updateSegment, "123", {});

    it("Throws a ResourceNotFoundError error if the user segment does not exist", async () => {
      prismaMock.segment.findUnique.mockResolvedValue(null);
      await expect(updateSegment(mockSegmentId, mockSegmentCreateInput)).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    it("Throws a DatabaseError error if there is a PrismaClientKnownReuestError", async () => {
      const mockErrorMessage = "Mock error message";
      const errToThrow = new Prisma.PrismaClientKnownRequestError(mockErrorMessage, {
        code: "P2002",
        clientVersion: "0.0.1",
      });

      prismaMock.segment.update.mockRejectedValue(errToThrow);

      await expect(updateSegment(mockSegmentId, mockSegmentCreateInput)).rejects.toThrow(DatabaseError);
    });

    it("Throws a generic Error for unexpected exceptions", async () => {
      const mockErrorMessage = "Mock error message";
      prismaMock.segment.update.mockRejectedValue(new Error(mockErrorMessage));

      await expect(updateSegment(mockSegmentId, mockSegmentCreateInput)).rejects.toThrow(Error);
    });
  });
});

describe("Tests for deleteSegment service", () => {
  describe("Happy Path", () => {
    it("Deletes a user segment", async () => {
      prismaMock.segment.delete.mockResolvedValue(mockSegmentPrisma);
      const result = await deleteSegment(mockSegmentId);
      expect(result).toEqual(mockSegment);
    });
  });

  describe("Sad Path", () => {
    testInputValidation(deleteSegment, "123");

    it("Throws a ResourceNotFoundError error if the user segment does not exist", async () => {
      prismaMock.segment.findUnique.mockResolvedValue(null);
      await expect(deleteSegment(mockSegmentId)).rejects.toThrow(ResourceNotFoundError);
    });

    it("Throws a DatabaseError error if there is a PrismaClientKnownRequestError", async () => {
      const mockErrorMessage = "Mock error message";
      const errToThrow = new Prisma.PrismaClientKnownRequestError(mockErrorMessage, {
        code: "P2002",
        clientVersion: "0.0.1",
      });

      prismaMock.segment.delete.mockRejectedValue(errToThrow);

      await expect(deleteSegment(mockSegmentId)).rejects.toThrow(DatabaseError);
    });

    it("Throws a generic Error for unexpected exceptions", async () => {
      const mockErrorMessage = "Mock error message";
      prismaMock.segment.delete.mockRejectedValue(new Error(mockErrorMessage));

      await expect(deleteSegment(mockSegmentId)).rejects.toThrow(Error);
    });
  });
});

describe("Tests for cloneSegment service", () => {
  describe("Happy Path", () => {
    it("Clones a user segment", async () => {
      prismaMock.segment.create.mockResolvedValue({
        ...mockSegmentPrisma,
        title: `Copy of ${mockSegmentPrisma.title}`,
      });
      const result = await cloneSegment(mockSegmentId, mockSurveyId);
      expect(result).toEqual({
        ...mockSegment,
        title: `Copy of ${mockSegment.title}`,
      });
    });
  });

  describe("Sad Path", () => {
    testInputValidation(cloneSegment, "123", "123");

    it("Throws a ResourceNotFoundError error if the user segment does not exist", async () => {
      prismaMock.segment.findUnique.mockResolvedValue(null);
      await expect(cloneSegment(mockSegmentId, mockSurveyId)).rejects.toThrow(ResourceNotFoundError);
    });

    it("Throws a DatabaseError error if there is a PrismaClientKnownRequestError", async () => {
      const mockErrorMessage = "Mock error message";
      const errToThrow = new Prisma.PrismaClientKnownRequestError(mockErrorMessage, {
        code: "P2002",
        clientVersion: "0.0.1",
      });

      prismaMock.segment.create.mockRejectedValue(errToThrow);

      await expect(cloneSegment(mockSegmentId, mockSurveyId)).rejects.toThrow(DatabaseError);
    });

    it("Throws a generic Error for unexpected exceptions", async () => {
      const mockErrorMessage = "Mock error message";
      prismaMock.segment.create.mockRejectedValue(new Error(mockErrorMessage));

      await expect(cloneSegment(mockSegmentId, mockSurveyId)).rejects.toThrow(Error);
    });
  });
});
