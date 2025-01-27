import mongoose from "mongoose";


const privacySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Privacy = mongoose.model('privacy', privacySchema);
export default Privacy