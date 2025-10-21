module.exports = {
  plugins: {
    tailwindcss: {},
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    cssnano: process.env.NODE_ENV === 'production' ? { preset: 'default' } : false,
  }
}