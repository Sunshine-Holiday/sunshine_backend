import fs from "fs";
import path from "path";

class ErrorHandler extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  
  export default ErrorHandler;

  export const deleteImage = (oldPath) => {
    if (oldPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
      console.log("delete Image Succefully", oldPath)
    } else {
      console.log("Unable to delete Image Succefully", oldPath)
    }
  };