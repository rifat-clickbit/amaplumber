# AmaPlumber build notes

## Build setup

The React/JSX app lives in `src/app.jsx` and is bundled into `dist/app.bundle.js`.

```
npm install
npm run build
```

`index.html` loads `dist/app.bundle.js` with `defer`, so it no longer compiles JSX in the browser or fetches libraries from a CDN.

## Workflow

1. Edit `src/app.jsx` (or `index.html` CSS/markup).
2. Run `npm run build` to regenerate `dist/app.bundle.js`.
3. Verify by refreshing the browser preview.

## Serve locally

```
npx http-server -p 8080
```
