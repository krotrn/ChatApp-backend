import axios from "axios";
import ApiError from "../utils/ApiError";

export const validateUser = async (
  userIds: string[]
): Promise<Array<{ id: string; fullName: string; avatar: string | null }>> => {
  try {
    const { data } = await axios.post(
      `${process.env.CLIENT_URL}/api/v1/internal/validate/bulk`,
      { userIds },
      {
        headers: {
          "x-internal-api-key": process.env.INTERNAL_API_KEY,
        },
        timeout: 3000,
      }
    );

    if (!data.success) {
      throw new ApiError(500, "Validation service error");
    }

    return data.users;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        error.response?.status || 500,
        error.response?.data?.error || "User validation failed"
      );
    }
    throw new ApiError(500, "Internal server error during validation");
  }
};
