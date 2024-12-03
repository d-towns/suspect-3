// tailwind.config.js

/** @type {import('tailwindcss').Config} */
const { blackA, green, mauve, slate, violet } = require("@radix-ui/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
	theme: {
		extend: {
			colors: {
				...blackA,
				...green,
				...mauve,
				...slate,
				...violet,
			},
			keyframes: {
				hide: {
					from: { opacity: "1" },
					to: { opacity: "0" },
				},
				slideIn: {
					from: {
						transform: "translateX(calc(100% + var(--viewport-padding)))",
					},
					to: { transform: "translateX(0)" },
				},
				swipeOut: {
					from: { transform: "translateX(var(--radix-toast-swipe-end-x))" },
					to: { transform: "translateX(calc(100% + var(--viewport-padding)))" },
				},
				slideDownAndFade: {
					from: { opacity: "0", transform: "translateY(-2px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				slideLeftAndFade: {
					from: { opacity: "0", transform: "translateX(2px)" },
					to: { opacity: "1", transform: "translateX(0)" },
				},
				slideUpAndFade: {
					from: { opacity: "0", transform: "translateY(2px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				slideRightAndFade: {
					from: { opacity: "0", transform: "translateX(-2px)" },
					to: { opacity: "1", transform: "translateX(0)" },
				},
				slideDown: {
					from: { height: "0px" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				slideUp: {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0px" },
				},
			},
			animation: {
				hide: "hide 100ms ease-in",
				slideIn: "slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1)",
				swipeOut: "swipeOut 100ms ease-out",
				slideDownAndFade:
				"slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
			slideLeftAndFade:
				"slideLeftAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
			slideUpAndFade: "slideUpAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
			slideRightAndFade:
				"slideRightAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)",
				slideDown: "slideDown 600ms cubic-bezier(0.87, 0, 0.13, 1)",
				slideUp: "slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)",
			},
		},
	},
	plugins: [],
};
