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
    // while the user could be found through the Team model, including the user
    // makes it easier when handling authorization for updating/deleting
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const Note = model("Note", noteSchema);

module.exports = Note;
