import multer from "multer";

/**
 * Multer storage configuration for handling file uploads.
 * 
 * This configuration sets the destination and filename for uploaded files.
 * 
 * - `destination`: Specifies the directory where uploaded files will be stored.
 * - `filename`: Generates a unique filename for each uploaded file by appending
 *   the current timestamp and a random number to the original filename (with spaces
 *   replaced by hyphens and converted to lowercase).
 * 
 * @param {Express.Request} req - The request object.
 * @param {Express.Multer.File} file - The file object containing information about the uploaded file.
 * @param {Function} cb - The callback function to call with the destination or filename.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images");
  },
  filename: (req, file, cb) => {
    let fileExtension = "";
    if (file.originalname.split(".").length > 1) {
      fileExtension = file.originalname.substring(
        file.originalname.lastIndexOf(".")
      );
    }
    const filenameWithoutExtension = file.originalname
      .toLowerCase()
      .split(" ")
      .join("-")
      ?.split(".")[0];
    cb(
      null,
      filenameWithoutExtension +
        Date.now() +
        Math.ceil(Math.random() * 1e5) +
        fileExtension
    );
  },
});

/**
 * Middleware for handling file uploads using multer.
 * 
 * This middleware is configured with the following options:
 * - `storage`: The storage engine to use for uploaded files.
 * - `limits`: An object specifying various limits on the uploaded files.
 *   - `fileSize`: The maximum file size allowed for uploads, set to 1 MB.
 * 
 * @constant
 * @type {multer.Multer}
 */
export const upload: multer.Multer = multer({
  storage,
  limits: {
    fileSize: 1 * 1000 * 1000,
  },
});
