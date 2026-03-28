import * as Tone from "tone";

const DRUM_SAMPLE_NOTE_MAP = {
  C1: "kick.wav",
  D1: "snare.wav",
  "F#1": "hihat.wav",
} as const;

export interface DrumSamplerRack {
  output: Tone.Volume;
  sampler: Tone.Sampler;
}

let drumSamplerRack: DrumSamplerRack | null = null;
let drumSamplerLoadPromise: Promise<DrumSamplerRack> | null = null;
let drumSamplerReady = false;

function createDrumSamplerRack(): DrumSamplerRack {
  const output = new Tone.Volume(0).toDestination();
  const sampler = new Tone.Sampler({
    urls: DRUM_SAMPLE_NOTE_MAP,
    baseUrl: "/samples/drums/",
    release: 0.2,
    onload: () => {
      drumSamplerReady = true;
    },
  }).connect(output);

  return {
    output,
    sampler,
  };
}

export function getDrumSamplerRack(): DrumSamplerRack {
  if (!drumSamplerRack) {
    drumSamplerRack = createDrumSamplerRack();
  }

  return drumSamplerRack;
}

export async function ensureDrumSamplerLoaded(): Promise<DrumSamplerRack> {
  const rack = getDrumSamplerRack();

  if (drumSamplerReady) {
    return rack;
  }

  if (!drumSamplerLoadPromise) {
    drumSamplerLoadPromise = Tone.loaded()
      .then(() => {
        drumSamplerReady = true;
        return rack;
      })
      .finally(() => {
        drumSamplerLoadPromise = null;
      });
  }

  return drumSamplerLoadPromise;
}

export function disposeDrumSampler(): void {
  if (!drumSamplerRack) {
    return;
  }

  drumSamplerRack.sampler.releaseAll();
  drumSamplerRack.sampler.dispose();
  drumSamplerRack.output.dispose();
  drumSamplerRack = null;
  drumSamplerLoadPromise = null;
  drumSamplerReady = false;
}
