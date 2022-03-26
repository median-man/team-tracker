const { Schema, model } = require("mongoose");
const validator = require("validator");
const { default: mongoose } = require("mongoose");

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    // owner of the team
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    app: {
      title: {
        type: String,
        trim: true,
        minlength: 1,
        maxlength: 50,
      },
      repoUrl: {
        type: String,
        validate: {
          validator: (v) =>
            validator.isURL(v, {
              // must be a github repo
              host_whitelist: ["github.com"],
            }),
        },
      },
      // url to the deployed app
      url: {
        type: String,
        validate: {
          validator: (v) => validator.isURL(v),
        },
      },
      links: [{ label: String, url: String }],
    },
    members: {
      type: [{ type: String, minlength: 1, maxlength: 50 }],
      validate: {
        validator: (v) => v.length < 6,
        message:
          "Invalid members length. A team may have a maximum of 5 members.",
      },
    },
  },
  { timestamps: true }
);

// Notes about this team
teamSchema.virtual("notes", {
  ref: "Note",
  localField: "_id",
  foreignField: "team",
});

const Team = model("Team", teamSchema);

module.exports = Team;
