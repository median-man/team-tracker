const colors = require("tailwindcss/colors");

module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      white: colors.white,
      blue: colors.sky,
      red: colors.red,
      gray: colors.neutral,
    },
    extend: {
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
