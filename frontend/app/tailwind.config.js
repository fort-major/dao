const tailwindMdBase = require("@geoffcodesthings/tailwind-md-base");
const defaultTheme = require("tailwindcss/resolveConfig")(
  require("tailwindcss/defaultConfig")
).theme;
const { COLORS } = require("./src/utils/colors");

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
      fontSize: {
        md: "1rem",
      },
      width: {
        128: "32rem",
        256: "64rem",
      },
      markdownBase: {
        wrapperClass: "md-content",

        h1: {
          fontSize: "2rem",
        },

        h2: {
          fontSize: "1.8rem",
        },

        h3: {
          fontSize: "1.5rem",
        },

        h4: {
          fontSize: "1.2rem",
        },

        h5: {
          fontSize: "1rem",
        },

        h6: {
          fontSize: "0.8rem",
        },

        ul: {
          listStylePosition: "inside",
        },

        ol: {
          listStylePosition: "inside",
        },

        strong: {
          fontWeight: "bold",
        },

        em: {
          textDecoration: "underline",
        },

        "p > code": {
          backgroundColor: COLORS.gray[190],
          borderRadius: "0.2rem",
          fontWeight: 600,
          color: COLORS.black,
        },
        "pre > code": {
          backgroundColor: "transparent",
          padding: 0,
          fontWeight: 500,
          color: COLORS.black,
        },
        pre: {
          backgroundColor: COLORS.gray[190],
          borderRadius: "0.2rem",
          padding: "1px .5rem",
        },
      },
    },
  },
  plugins: [tailwindMdBase()],
};
