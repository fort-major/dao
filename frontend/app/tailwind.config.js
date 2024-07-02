const tailwindMdBase = require("@geoffcodesthings/tailwind-md-base");
const defaultTheme = require("tailwindcss/resolveConfig")(
  require("tailwindcss/defaultConfig")
).theme;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css,md,mdx,html,json,scss}",
  ],
  darkMode: "class", // or 'media'
  theme: {
    colors: {
      white: "#FFFFFF",
      black: "#0A0B15",
      gray: {
        105: "#161721",
        108: "#1D1E27",
        110: "#22232C",
        115: "#2F2F38",
        120: "#3B3C44",
        125: "#474850",
        130: "#53545B",
        140: "#6C6D73",
        150: "#84858A",
        165: "#A9AAAD",
        175: "#C2C2C4",
        190: "#E6E6E7",
      },
      chartreuse: "#E0FF25",
      green: "#53FF50",
      blue: "#15E3FF",
      darkBlue: "#5057FF",
      pink: "#FF41FF",
      orange: "#FF7425",
      errorRed: "#FC2D2D",
    },
    extend: {
      fontFamily: {
        primary: "DM Sans",
        title: "Unique",
      },
      width: {
        128: "32rem",
        256: "64rem",
      },
      markdownBase: {
        wrapperClass: "md-content",

        h1: {
          fontSize: defaultTheme.fontSize["2xl"],
        },

        h2: {
          fontSize: defaultTheme.fontSize["xl"],
        },

        h3: {
          fontSize: defaultTheme.fontSize["lg"],
        },

        h4: {
          fontSize: defaultTheme.fontSize.base,
        },

        h5: {
          fontSize: defaultTheme.fontSize.base,
        },

        h6: {
          fontSize: defaultTheme.fontSize.base,
        },

        ul: {
          listStylePosition: "inside",
        },

        ol: {
          listStyleType: "none",
          listStylePosition: "inside",
        },

        "ol > li": {
          display: "block",
        },

        "ol > li > p": {
          listStyleType: "decimal",
          display: "list-item",
        },
      },
    },
  },
  plugins: [tailwindMdBase()],
};
