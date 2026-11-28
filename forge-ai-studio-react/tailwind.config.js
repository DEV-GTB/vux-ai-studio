/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        forge: {
          // Deep space backgrounds - VUX palette
          bg: '#0b1326',
          surface: '#0b1326',
          surfaceLow: '#131b2e',
          surfaceHigh: '#222a3d',
          surfaceElevated: '#171f33',
          
          // Primary brand cyan
          primary: '#4cd7f6',
          primaryHover: '#06b6d4',
          primaryLight: 'rgba(76, 215, 246, 0.1)',
          
          // AI purple - Soft Purple
          ai: '#8b85f5',
          aiLight: 'rgba(139, 133, 245, 0.1)',
          aiGlow: 'rgba(139, 133, 245, 0.3)',
          
          // Technical cyan - Sky Blue
          tech: '#38bdf8',
          techLight: 'rgba(56, 189, 248, 0.1)',
          
          // Success - Mint Teal
          success: '#2dd4bf',
          successLight: 'rgba(45, 212, 191, 0.1)',
          
          // Error - Coral Rose
          error: '#fb7185',
          errorLight: 'rgba(251, 113, 133, 0.1)',
          
          // Warning - Warm Amber
          warning: '#fbbf24',
          warningLight: 'rgba(251, 191, 36, 0.1)',
          
          // Text hierarchy
          text: '#dae2fd',
          textMuted: '#b8c8c8',
          textDim: '#869397',
          
          // Borders
          border: 'rgba(38, 51, 74, 0.5)',
          borderLight: 'rgba(38, 51, 74, 0.3)',
          borderActive: 'rgba(76, 215, 246, 0.45)',
          borderAI: 'rgba(139, 133, 245, 0.4)',
        },
        // New Landing Page Colors
        vux: {
          background: '#0b1326',
          surface: '#0b1326',
          surfaceBright: '#31394d',
          surfaceDim: '#0b1326',
          surfaceContainer: '#171f33',
          surfaceContainerLow: '#131b2e',
          surfaceContainerHigh: '#222a3d',
          surfaceContainerHighest: '#2d3449',
          surfaceContainerLowest: '#060e20',
          surfaceVariant: '#2d3449',
          surfaceTint: '#4cd7f6',
          
          primary: '#4cd7f6',
          primaryContainer: '#06b6d4',
          primaryFixed: '#acedff',
          primaryFixedDim: '#4cd7f6',
          inversePrimary: '#00687a',
          onPrimary: '#003640',
          onPrimaryContainer: '#00424f',
          onPrimaryFixed: '#001f26',
          onPrimaryFixedVariant: '#004e5c',
          
          secondary: '#bcc7de',
          secondaryContainer: '#3e495d',
          secondaryFixed: '#d8e3fb',
          secondaryFixedDim: '#bcc7de',
          onSecondary: '#263143',
          onSecondaryContainer: '#aeb9d0',
          onSecondaryFixed: '#111c2d',
          onSecondaryFixedVariant: '#3c475a',
          
          tertiary: '#ffb873',
          tertiaryContainer: '#e89337',
          tertiaryFixed: '#ffdcbf',
          tertiaryFixedDim: '#ffb873',
          onTertiary: '#4b2800',
          onTertiaryContainer: '#5b3200',
          onTertiaryFixed: '#2d1600',
          onTertiaryFixedVariant: '#6a3b00',
          
          error: '#ffb4ab',
          errorContainer: '#93000a',
          onError: '#690005',
          onErrorContainer: '#ffdad6',
          
          outline: '#869397',
          outlineVariant: '#3d494c',
          
          onBackground: '#dae2fd',
          onSurface: '#dae2fd',
          onSurfaceVariant: '#bcc9cd',
          inverseSurface: '#dae2fd',
          inverseOnSurface: '#283044',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'headline-xl': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'label-caps': ['JetBrains Mono', 'monospace'],
        'body-sm': ['Inter', 'sans-serif'],
        'headline-md': ['Inter', 'sans-serif'],
        'headline-lg': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '700' }],
        'body-md': ['16px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
        'body-sm': ['14px', { lineHeight: '20px', letterSpacing: '0', fontWeight: '400' }],
        'headline-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '600' }],
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '20': '20px',
        '24': '24px',
        '32': '32px',
        '40': '40px',
        '48': '48px',
        '64': '64px',
        '96': '96px',
        '128': '128px',
        'unit': '4px',
        'sm': '8px',
        '2xl': '64px',
        'margin-desktop': '32px',
        'xl': '40px',
        'margin-mobile': '16px',
        'gutter': '16px',
        'xs': '4px',
        'md': '16px',
        'lg': '24px',
      },
      borderRadius: {
        'DEFAULT': '0.125rem',
        'lg': '0.25rem',
        'xl': '0.5rem',
        'full': '0.75rem',
        '8': '8px',
        '10': '10px',
        '12': '12px',
        '14': '14px',
        '16': '16px',
        '20': '20px',
      },
      boxShadow: {
        'glow': '0 0 25px rgba(255, 106, 0, 0.3)',
        'glow-ai': '0 0 25px rgba(155, 89, 182, 0.3)',
        'card': '0 16px 32px -20px rgba(20, 23, 31, 0.18)',
        'panel': '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}