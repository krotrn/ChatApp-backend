import axios from 'axios';
import ApiError from './ApiError';


export const validateUser = async (userId: string): Promise<boolean> => {
  try {
    const response = await axios.get(
      `${process.env.REPO1_API_URL}/users/${userId}`,
      { timeout: 5000 }
    );
    return !!response.data?.id;
  } catch (error) {
    console.log(error)
    throw new ApiError(404, 'User not found in main system');
  }
};