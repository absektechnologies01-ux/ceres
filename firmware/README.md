# Ceres hardware scanner firmware

Replaces the Flutter mobile scanner app with two ESP32 boards:

- **esp32-main/** — the existing conveyor/sensor/buzzer board, now also driving
  the 2.4" SPI TFT + touch UI (login, class/course select, session control,
  scan status). No WebSocket link anymore — see the plan doc for why.
- **esp32-cam/** — a separate ESP32-CAM (OV3660) module dedicated to capturing
  each sheet and uploading it through the backend.

Full design rationale, the wiring table, and pin-budget reasoning live in
the plan this was built from (ask Claude to recall it, or see
`~/.claude/plans/now-i-want-to-enchanted-bonbon.md`).

## esp32-main setup

1. Arduino Library Manager: install **TFT_eSPI** (Bodmer), **XPT2046_Touchscreen**
   (Paul Stoffregen), **ArduinoJson** (v6.x).
2. Copy `esp32-main/User_Setup.h` over `<libraries>/TFT_eSPI/User_Setup.h`.
3. Edit the top of `esp32-main.ino`: `WIFI_SSID`/`WIFI_PASSWORD`, `API_BASE_URL`
   (backend), `ESP32_CAM_BASE_URL` (must match the camera board's static IP —
   see esp32-cam setup below).
4. Calibrate `TS_MINX`/`TS_MAXX`/`TS_MINY`/`TS_MAXY` for your specific touch
   panel (run a simple touch-test sketch first if taps land off-target).
5. Flash via USB as normal.

## esp32-cam setup

1. Arduino board package: **AI Thinker ESP32-CAM** (or your board's exact
   variant) with OV3660 sensor selected.
2. Edit the top of `esp32-cam.ino`: WiFi credentials, `API_BASE_URL`, and the
   static IP block (must match what you set in `esp32-main.ino`'s
   `ESP32_CAM_BASE_URL`).
3. Flashing requires an external USB-to-serial adapter (no onboard USB) —
   GPIO0 to GND during flash, removed for normal run, standard ESP32-CAM
   procedure.

## Known gaps / things to verify on the bench before trusting this end-to-end

- Touch calibration constants are placeholders — will need real tuning.
- The on-screen keyboard is functional but basic (lowercase/uppercase + `@`/`.`/space) —
  no numbers row; fine for typical email/password but extend `KB_ROW0_LOWER` etc. if needed.
- `triggerCapture()` in esp32-main blocks for up to ~150s (matches the backend's
  OCR poll budget) — this is the same latency the phone already had per sheet,
  not a regression, but confirm it's still acceptable in practice.
- No silent token-refresh loop in the background — refresh only happens
  reactively when a call returns 401.
