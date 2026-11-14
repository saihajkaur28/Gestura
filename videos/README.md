# ISL video recordings

This directory holds the **Indian Sign Language (ISL)** video clips that power the
Text → Sign direction. It is intentionally **not committed to Git**: the recordings
are private/large assets that the project owner provides separately.

## Expected layout

```
videos/
  hello/
    hello.mp4
  water/
    water.mp4
  help/
    help.mp4
  thank_you/
    thank_you.mp4
```

- One folder per sign.
- The folder name is the sign label (use lowercase `snake_case`, e.g. `thank_you`).
- Supported file extensions: `.mp4`, `.webm`, `.mov`, `.m4v`, `.ogv`.
- If a folder contains several clips, a file whose name matches the folder name is
  preferred; otherwise the first clip (alphabetically) is used.

## Storage strategy for deployment

Recordings are excluded from the repository on purpose. At runtime the backend
serves them from the directory configured by the `VIDEOS_DIR` environment variable
(defaults to `./videos` relative to the repository root). For a hosted deployment,
point `VIDEOS_DIR` at a mounted volume / private object-storage mount that contains
this same folder structure. Nothing is uploaded to Git.

The absence of a folder or clip is reported honestly by the API and the UI; no
placeholder or fabricated video is ever substituted.
