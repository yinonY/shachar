# Dawn Alarm

A gentle Android alarm clock. Starting 30 minutes before wake time, the phone screen
brightens gradually (artificial sunrise), then soft sounds fade in (birdsong, calm ambience),
then gentle vibration, and finally a real alarm ring at a maximum time if the user hasn't
woken up.

## Platform & stack
- **Android only.** iOS is out of scope (OS restrictions make this feature set impractical).
- Expo (managed workflow) + React Native + TypeScript.
- **Development build, not Expo Go** — the app needs custom native code.
  Run with `npx expo run:android` on a physical device.
- Dev machine: Windows. Editor: VS Code.
- No backend, no database server. All data is stored locally on the device.

## Architecture
- **Navigation:** Expo Router (file-based, built on React Navigation). Stack for
  alarm list → edit alarm; a separate full-screen route for the active wake sequence.
- **Screens vs components:** screens in `app/`, reusable UI in `src/components/`.
- **State:** local state with hooks; alarms and settings shared via Context API
  (`src/state/`).
- **Storage layer** (`src/storage/`): the only place that reads/writes persisted data
  (AsyncStorage). Screens never touch storage directly.
- **Wake engine** (`src/wake/`): pure TypeScript that computes, for any moment in the
  wake window, the target brightness, sound volume, which sound layer is active,
  vibration pattern, and whether the final ring has started. No side effects —
  easy to unit test.
- **Native module** (`modules/alarm-scheduler/`, Expo Modules API, Kotlin):
  - schedule exact alarms with `AlarmManager.setAlarmClock`
  - full-screen intent to show the wake screen over the lock screen and turn the screen on
  - foreground service + wake lock so the sequence keeps running for 30+ minutes
  - re-schedule alarms after device reboot
  Keep this module as thin as possible: it starts the sequence; JS drives brightness and audio.

## Wake sequence (defaults, user-configurable later)
1. T-30 min: screen on, very dim warm color; brightness rises smoothly to max.
2. T-15 min: birdsong fades in from near silence.
3. T-5 min: calm ambience layer + very soft vibration pulses.
4. T (wake time): volume and vibration keep rising.
5. T + max delay: standard alarm ring at full volume until dismissed.
Snooze/dismiss must be possible at any stage.

## Milestones
1. Alarm list + create/edit screen + local storage (UI only, no real alarms).
2. Wake engine + wake screen, triggered manually by a "test" button (brightness, audio, vibration).
3. Native alarm-scheduler module: real scheduled alarms that fire from a locked, idle phone.
4. Reliability: reboot handling, battery-optimization prompts, permission flows.
5. Polish: settings for sequence timing, sound choice, UI in Hebrew (RTL).

## Working rules
- Work one milestone (or smaller) at a time. Propose a plan before large changes.
- After each working step, suggest a git commit with a clear message.
- Unit-test the wake engine.
- Explain non-obvious decisions briefly, especially Android-specific native code —
  the developer wants to understand what is being built.
- Don't add libraries without saying why.