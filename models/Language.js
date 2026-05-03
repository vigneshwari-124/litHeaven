const mongoose = require("mongoose");

const LanguageSchema = new mongoose.Schema(
  {
    languageCode: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true
    },

    languageName: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Language", LanguageSchema);
