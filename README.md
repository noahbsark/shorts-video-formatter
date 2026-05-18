# Shorts Video Formatter

A static, client-side app for formatting local video files into YouTube Shorts / TikTok / Instagram Reels style layouts.

## What it does

- Runs entirely in the browser; no server and no video uploads.
- Selects a local video file.
- Outputs 9:16 vertical, 1:1 square, or 16:9 landscape canvas sizes.
- Supports fill/crop or fit-with-background modes.
- Can add a blurred background behind fitted videos.
- Exports through the browser MediaRecorder API.

## Deploy on GitHub Pages

1. Unzip this folder.
2. Create a new GitHub repository.
3. Upload `index.html`, `styles.css`, `app.js`, `.nojekyll`, and this `README.md` to the repository root.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your default branch, usually `main`, and the root folder `/`.
7. Save. GitHub will publish the app as a Pages site.

## Browser notes

Chrome and Edge are recommended. The app uses Canvas, HTML video, and MediaRecorder. Some browsers export WebM instead of MP4. YouTube accepts WebM uploads.

Exports happen in real time. A 60-second clip usually takes about 60 seconds to render.

## Suggested prompt used to build this

Build a static GitHub Pages app with no backend. The app should let a user select a local video file, preview it on a canvas, choose short-video social formats such as 9:16 YouTube Shorts/Reels/TikTok, square 1:1, and 16:9 landscape, choose crop or contain fitting, optionally add a blurred background, trim start and end time, and export the result in the browser using MediaRecorder. Use plain HTML, CSS, and JavaScript so the user can unzip the files, upload them to a GitHub repository, enable GitHub Pages, and run the app. Include polished responsive UI, privacy notes, export progress, thumbnail export, and clear deployment instructions.
