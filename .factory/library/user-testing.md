# User Testing

Testing surface: tools, URLs, setup steps, isolation notes, known quirks.

---

## Testing Tools
- **agent-browser:** Used for basic DOM interaction and sanity checks on `localhost:5173`.
- **Manual Verification:** Required for testing the actual `Midscene` OS interaction and the `desktopCapturer` frame transmission, since these rely on native OS privileges and the user's microphone/screen.

## Known Quirks
- The frontend will transition from a Vite app to an Electron app. While Vite runs on port `5173`, the compiled Electron app runs natively. `agent-browser` might only be able to test the React UI if it's served over HTTP during development, but the native OS actions and `desktopCapturer` features MUST be tested by booting Electron.
- The `bash-mcp-server` will be purged; do not attempt to start it during testing.
- `gemini-3.1-pro-preview` is used for `Midscene`, while `gemini-2.5-flash-native-audio-preview` is used for the audio connection.

## Flow Validator Guidance: Electron
- To test Electron features, use Playwright's _electron module.
- Launch the backend first so the Electron app can connect to the WebSocket.
- Run your tests via \
px playwright test\ inside the \rontend/\ directory.
- Ensure your playwright tests capture screenshots or console logs as evidence.
