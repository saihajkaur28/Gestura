# Gestura

Browser-based accessibility and communication platform. The first verified slice is a Chrome extension that reads **in-page YouTube captions** and shows a synchronized transcript in a side panel.

GenASL (`vendor/genasl`) is a **protected** ASL pipeline copy. Do not edit it in place. Sign-Kit (`vendor/sign-kit`) is an ISL Mixamo animation reference. SignAvatars motion is not vendored (research license required).

## Load the extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select the `extension/` folder
4. Open a YouTube watch page that has captions enabled
5. Open the Gestura side panel from the toolbar or the floating **Gestura** button

## Tests

```bash
node --test tests/test-caption-segment.cjs tests/test-messages.cjs tests/test-youtube-id.cjs
```

## Status

Implemented: Manifest V3 shell, messaging, YouTube adapter, transcript UI.  
Not implemented: Gemini, Whisper, GenASL avatar playback, Braille, Morse.

Details: `GESTURA_IMPLEMENTATION_PLAN.md`.
