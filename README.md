# LoopForge
Create simple loop ideas

## Run the app

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

Loop Forge is a small React + TypeScript + Vite app that generates one short loop at a time, plays it with Tone.js, and exports the result as a MIDI file for use in a DAW.

## Docker

Build the production image:

```bash
docker build -t loop-forge:local .
```

Run the container and publish it on port 8080:

```bash
docker run --rm -p 8080:80 loop-forge:local
```

Then open `http://localhost:8080`.

The Docker image uses a multi-stage build:
- `node:20-alpine` builds the Vite app
- `nginx:1.27-alpine` serves the generated static files
