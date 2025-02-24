import axios from "axios";
import ApiError from "./ApiError";
import redisClient from "./redisClient";

export const validateUser = async (userId: string): Promise<boolean> => {
  try {
    const cacheKey = `user:${userId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return true;
    const { data } = await axios.get(`${process.env.REPO1_API}/users/validate?userId=${userId}`);


    if (data.valid) {
      await redisClient.set(cacheKey, "1", { EX: 300 });
      return true;
    }
    return false;
  } catch (error) {
    console.log(error);
    throw new ApiError(404, "User not found in main system");
  }
};
