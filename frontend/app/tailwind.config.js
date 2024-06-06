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
    extend: {},
  },
  plugins: [tailwindMdBase()],
};
