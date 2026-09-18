# CGZSA Frontend

This folder owns the Next.js application surface:

- public and admin routes in `src/app`
- public and admin React components in `src/components`
- thin API route and admin action entrypoints required by Next.js discovery
- static assets in `public`
- frontend-specific Next and PostCSS configuration

The API route and admin action files stay here only where Next needs them in the
app tree. Their implementations live in `../cgzsa-backend/src/api` and
`../cgzsa-backend/src/actions`.
