import axios from "axios";
import ApiError from "../utils/ApiError";

export const validateUser = async (
  userIds: string[]
): Promise<Array<{ id: string; name: string; avatarUrl: string | null }>> => {
  if (!userIds.length) return [];

  try {
    console.log(`Validating users: ${userIds.join(", ")}`);

    const { data } = await axios.post(
      `${process.env.VALIDATION_URL}/api/v1/internal/validate/bulk`,
      { userIds },
      {
        headers: {
          "x-internal-api-key": process.env.INTERNAL_API_KEY,
        },
        timeout: 10000,
      }
    );

    if (!data.success) {
      console.error("Validation service error:", data);
      throw new ApiError(500, "Validation service error");
    }

    console.log(`Successfully validated ${data.users?.length || 0} users`);
    return data.users;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        error.response?.status || 500,
        error.response?.data?.error || "User validation failed"
      );
    }
    console.error("Non-axios error during validation:", error);
  }
  throw new ApiError(
    500,
    "User validation service is temporarily unavailable. Please try again later."
  );
};
