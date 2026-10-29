import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_WAKE_SETTINGS, getWakeState } from './engine.ts';

const wakeAt = 60 * 60_000;

test('remains idle before the sunrise window', () => {
  const state = getWakeState(wakeAt - 31 * 60_000, wakeAt);

  assert.equal(state.phase, 'idle');
  assert.equal(state.brightness, 0);
  assert.equal(state.shouldRing, false);
});

test('raises brightness smoothly during sunrise', () => {
  const early = getWakeState(wakeAt - 25 * 60_000, wakeAt);
  const later = getWakeState(wakeAt - 20 * 60_000, wakeAt);

  assert.equal(early.phase, 'sunrise');
  assert.ok(early.brightness > 0);
  assert.ok(later.brightness > early.brightness);
  assert.equal(early.birdsongVolume, 0);
});

test('introduces birdsong and ambience at their configured boundaries', () => {
  const beforeBirdsong = getWakeState(wakeAt - 16 * 60_000, wakeAt);
  const birdsong = getWakeState(wakeAt - 15 * 60_000, wakeAt);
  const ambience = getWakeState(wakeAt - 5 * 60_000, wakeAt);
  const afterAmbience = getWakeState(wakeAt - 4 * 60_000, wakeAt);

  assert.equal(beforeBirdsong.birdsongVolume, 0);
  assert.equal(birdsong.phase, 'birdsong');
  assert.equal(ambience.phase, 'ambience');
  assert.ok(afterAmbience.ambienceVolume > 0);
  assert.equal(ambience.vibrationIntervalMs, 1_200);
});

test('switches to the final ring only after the configured delay', () => {
  const wakeTime = getWakeState(wakeAt, wakeAt);
  const beforeRing = getWakeState(wakeAt + 5 * 60_000 - 1, wakeAt);
  const ring = getWakeState(wakeAt + 5 * 60_000, wakeAt);

  assert.equal(wakeTime.phase, 'waking');
  assert.equal(wakeTime.ringVolume, 0);
  assert.equal(beforeRing.shouldRing, false);
  assert.equal(ring.phase, 'ringing');
  assert.equal(ring.ringVolume, 1);
  assert.equal(ring.shouldRing, true);
});

test('zero-length stages transition immediately', () => {
  const state = getWakeState(100, 100, {
    ...DEFAULT_WAKE_SETTINGS,
    sunriseMinutes: 0,
    birdsongMinutes: 0,
    ambienceMinutes: 0,
    ringDelayMinutes: 0,
  });

  assert.equal(state.phase, 'ringing');
  assert.equal(state.brightness, 0.8);
  assert.equal(state.shouldRing, true);
});