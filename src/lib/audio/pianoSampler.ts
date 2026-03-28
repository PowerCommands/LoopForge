import * as Tone from "tone";

const PIANO_SAMPLE_NOTE_MAP = {
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
} as const;

export interface PianoSamplerRack {
  output: Tone.Volume;
  sampler: Tone.Sampler;
}

let pianoSamplerRack: PianoSamplerRack | null = null;
let pianoSamplerLoadPromise: Promise<PianoSamplerRack> | null = null;
let pianoSamplerReady = false;

function createPianoSamplerRack(): PianoSamplerRack {
  const output = new Tone.Volume(0).toDestination();
  const sampler = new Tone.Sampler({
    urls: PIANO_SAMPLE_NOTE_MAP,
    baseUrl: "/samples/piano/",
    release: 1,
    onload: () => {
      pianoSamplerReady = true;
    },
  }).connect(output);

  return {
    output,
    sampler,
  };
}

export function getPianoSamplerRack(): PianoSamplerRack {
  if (!pianoSamplerRack) {
    pianoSamplerRack = createPianoSamplerRack();
  }

  return pianoSamplerRack;
}

export async function ensurePianoSamplerLoaded(): Promise<PianoSamplerRack> {
  const rack = getPianoSamplerRack();

  if (pianoSamplerReady) {
    return rack;
  }

  if (!pianoSamplerLoadPromise) {
    pianoSamplerLoadPromise = Tone.loaded()
      .then(() => {
        pianoSamplerReady = true;
        return rack;
      })
      .finally(() => {
        pianoSamplerLoadPromise = null;
      });
  }

  return pianoSamplerLoadPromise;
}

export function isPianoSamplerReady(): boolean {
  return pianoSamplerReady;
}

export function disposePianoSampler(): void {
  if (!pianoSamplerRack) {
    return;
  }

  pianoSamplerRack.sampler.releaseAll();
  pianoSamplerRack.sampler.dispose();
  pianoSamplerRack.output.dispose();
  pianoSamplerRack = null;
  pianoSamplerLoadPromise = null;
  pianoSamplerReady = false;
}
