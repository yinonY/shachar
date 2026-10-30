import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleRate = 22_050;
const outputDirectory = join(import.meta.dirname, '..', 'assets', 'audio');

function writeWave(filename, durationSeconds, sampleAt) {
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const file = Buffer.alloc(44 + frameCount * 2);

  file.write('RIFF', 0);
  file.writeUInt32LE(file.length - 8, 4);
  file.write('WAVE', 8);
  file.write('fmt ', 12);
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(1, 22);
  file.writeUInt32LE(sampleRate, 24);
  file.writeUInt32LE(sampleRate * 2, 28);
  file.writeUInt16LE(2, 32);
  file.writeUInt16LE(16, 34);
  file.write('data', 36);
  file.writeUInt32LE(frameCount * 2, 40);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    const sample = Math.max(-1, Math.min(1, sampleAt(time, durationSeconds)));
    file.writeInt16LE(Math.round(sample * 32_767), 44 + frame * 2);
  }

  writeFileSync(join(outputDirectory, filename), file);
}

mkdirSync(outputDirectory, { recursive: true });

writeWave('birdsong.wav', 8, (time) => {
  const cycleTime = time % 4;
  const chirpTime = cycleTime % 0.72;
  if (cycleTime > 2.8 || chirpTime > 0.2) return 0;
  const envelope = Math.sin((Math.PI * chirpTime) / 0.2) ** 2;
  const frequency = 1_850 + 1_350 * (chirpTime / 0.2);
  return Math.sin(2 * Math.PI * frequency * time) * envelope * 0.2;
});

writeWave('ambience.wav', 8, (time) => {
  const swell = 0.7 + 0.3 * Math.sin((2 * Math.PI * time) / 8);
  return swell * (
    Math.sin(2 * Math.PI * 174.61 * time) * 0.15 +
    Math.sin(2 * Math.PI * 220 * time) * 0.1 +
    Math.sin(2 * Math.PI * 261.63 * time) * 0.06
  );
});

writeWave('rain.wav', 8, (time) => {
  const rain = Math.sin(2 * Math.PI * 173 * time) * 0.16 +
    Math.sin(2 * Math.PI * 281 * time) * 0.12 +
    Math.sin(2 * Math.PI * 397 * time) * 0.09 +
    Math.sin(2 * Math.PI * 613 * time) * 0.06 +
    Math.sin(2 * Math.PI * 997 * time) * 0.04;
  const patter = Math.sin(2 * Math.PI * 1_731 * time) * Math.sin(2 * Math.PI * 0.31 * time) * 0.05;
  return rain + patter;
});

writeWave('tone.wav', 8, (time) => {
  const swell = 0.65 + 0.35 * Math.sin((2 * Math.PI * time) / 8);
  return swell * (
    Math.sin(2 * Math.PI * 220 * time) * 0.17 +
    Math.sin(2 * Math.PI * 277.18 * time) * 0.1 +
    Math.sin(2 * Math.PI * 329.63 * time) * 0.07
  );
});

writeWave('alarm.wav', 2, (time) => {
  const pulse = time % 0.7;
  if (pulse > 0.45) return 0;
  const envelope = Math.min(1, pulse / 0.025, (0.45 - pulse) / 0.04);
  return envelope * (
    Math.sin(2 * Math.PI * 880 * time) * 0.28 +
    Math.sin(2 * Math.PI * 1_100 * time) * 0.2
  );
});