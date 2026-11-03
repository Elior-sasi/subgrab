# SubGrab

Cross-browser subtitle detector/exporter for Firefox, Chrome and Edge.

## What it does
- Detects accessible HTML5 `<track>` subtitle/caption resources.
- Reads populated HTML5 `TextTrack` cues when exposed by the player.
- Detects visible page resources ending in `.srt`, `.vtt`, `.ttml` or `.dfxp`.
- Converts WebVTT and basic TTML/DFXP to UTF-8 SRT.
- Supports multiple tracks/languages.

SubGrab does not bypass DRM, encryption, authentication controls or other access protections.

## Firefox test install
1. Download/clone this repository.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on**.
4. Select `manifest.json`.
5. Open a page containing a video, enable subtitles in the player, then click SubGrab.

## Chrome / Edge test install
1. Download/clone this repository.
2. Open the extensions page and enable Developer mode.
3. Choose **Load unpacked** and select this folder.
4. Open a page containing a video, enable subtitles in the player, then click SubGrab.

## Current limitations
Some players render captions internally or retrieve them in ways that browser extensions cannot access through normal page APIs. DRM/encrypted subtitle streams are intentionally unsupported.
