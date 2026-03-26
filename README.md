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

## Publish Docker container with Dockube 

```bash
build https://github.com/PowerCommands/LoopForge.git "loop-forge" --publish --platform=linux/amd64
```

## Help

Loop Forge is built to help you sketch loops quickly, shape them into usable ideas, and assemble those ideas into a simple arrangement without leaving the app.

### Studio

Studio is where you generate one loop at a time. Use the left sidebar to choose key, scale, tempo, loop length, mood, active layers, and sequence settings before generating a new idea.

### Piano Roll

The Piano Roll shows the current loop as editable notes for chords, melody, and bass. You can move notes, resize them, delete them, transpose the whole loop, and switch the active edit layer without changing the basic timing grid.

### Save And Add

Save stores the current edited loop state so the Current Loop summary follows your latest approved version. Add creates a new named loop in the arrangement from the current Piano Roll so you can build a song structure with several loop ideas.

### Arrangement

The Arrangement panel on the right is where you collect loops into a draft song structure. You can rename loops, drag to reorder them, preview them, reopen a loop for editing, remove loops, and save the arrangement to the library.

### Library

Library shows saved arrangements. From there you can reopen an arrangement in Studio, preview its loops, export it, or remove it from local storage.

### Lyrics

Lyrics lets you attach text to saved arrangements. Choose an arrangement, work on the left and right lyric panes, and keep your words connected to the musical structure you already saved.

### Settings

Settings focuses on storage and maintenance. It is where you inspect app data, backup behavior, Dropbox sync, and the saved arrangement library model.

### Typical Workflow

A common flow is: generate a loop in Studio, refine it in the Piano Roll, Save when the edit is approved, Add it to the Arrangement, repeat for more sections, then save the full arrangement to Library and continue with lyrics or export.
