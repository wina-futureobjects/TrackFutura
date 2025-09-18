/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#D291E2",    // Purple color (main primary)
        secondary: "#6EE5D9",  // Teal color (main secondary)  
        tertiary: "#62EF83",   // Green color (main tertiary)
        accent: "#A6FDED",     // Light cyan (additional color)
        
        // Add derived colors based on the main colors
        "primary-foreground": "#000000",
        "secondary-foreground": "#000000",
        "tertiary-foreground": "#000000",
        "accent-foreground": "#000000",

        // Add other utility colors using the theme colors
        background: "#FFFFFF",
        foreground: "#000000",
        destructive: "#62EF83",  // Use green for destructive actions
        "destructive-foreground": "#000000",
        muted: "#A6FDED",        // Use light cyan for muted
        "muted-foreground": "#000000",
        success: "#62EF83",      // Use green for success
        info: "#6EE5D9",         // Use teal for info
        warning: "#62EF83",      // Use green for warning
      },
      // Add compact spacing scale
      spacing: {
        '0.25': '0.0625rem', // 1px
        '0.75': '0.1875rem', // 3px
        '1.25': '0.3125rem', // 5px
        '1.75': '0.4375rem', // 7px
        '2.25': '0.5625rem', // 9px
        '2.75': '0.6875rem', // 11px
        '3.25': '0.8125rem', // 13px
        '3.75': '0.9375rem', // 15px
        '4.25': '1.0625rem', // 17px
        '4.75': '1.1875rem', // 19px
      },
      // Add compact font sizes
      fontSize: {
        'xs': ['0.7rem', { lineHeight: '1rem' }],
        'sm': ['0.8rem', { lineHeight: '1.25rem' }],
        'base': ['0.9rem', { lineHeight: '1.5rem' }],
        'lg': ['1rem', { lineHeight: '1.75rem' }],
        'xl': ['1.1rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.3rem', { lineHeight: '2rem' }],
        '3xl': ['1.6rem', { lineHeight: '2.25rem' }],
      },
    },
  },
  plugins: [],
} 