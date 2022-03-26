const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => validator.isEmail(v),
      message: ({ value }) => `'${value}' is not a valid email.`,
    },
  },
  password: {
    type: String,
    required: true,
    maxlength: 24,
    validate: {
      validator: (v) => validator.isStrongPassword(v, { minLength: 8 }),
      message:
        "Invalid password. Must contain uppercase and lowercase letters, numbers, and special characters.",
    },
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
});

// Teams owned by the user
userSchema.virtual("teams", {
  ref: "Team",
  localField: "_id",
  foreignField: "user",
});

userSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("password")) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  next();
});

userSchema.methods.isCorrectPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = model("User", userSchema);

module.exports = User;
