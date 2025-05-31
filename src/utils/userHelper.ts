import ApiError from "../utils/ApiError";
import pgClient from "../database/pgClient";

export const validateUser = async (
  userIds: string[],
): Promise<{ id: string; name: string; avatarUrl: string | null }[]> => {
  if (!userIds.length) {
    console.warn("No user IDs provided for validation.");
    return [];
  };

  try {
    console.log(`Validating users via direct DB query: ${userIds.join(", ")}`);

    if (!pgClient) {
      throw new ApiError(503, "PostgreSQL client is not available.");
    }

    const query = {
      text: 'SELECT id, COALESCE(name, username) AS name, "avatarUrl" FROM "User" WHERE id = ANY($1::text[])',
      values: [userIds],
    };

    const {
      rows,
    }: {
      rows: { id: string; name: string; avatarUrl: string | null }[];
    } = await pgClient.query(query);

    console.log(
      `Successfully validated ${rows.length} users`,
    );
    return rows.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
    }));
  } catch (error) {
    console.error("Error during direct DB user validation:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      "User validation via direct DB query failed. Please try again later.",
    );
  }
};
