const { Schema, model } = require("mongoose");
const { default: mongoose } = require("mongoose");

const noteSchema = new Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
  },
  { timestamps: true }
);

const Note = model("Note", noteSchema);

module.exports = Note;
