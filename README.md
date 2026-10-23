# Maths Practice (Rekenen oefenen)

The on-screen text is in Dutch (Flemish, `nl-BE`). All visible strings are in `index.html` and `app.js` if you want to adjust any wording.

A small, static web app for practising addition and subtraction with numbers 0 to 10. Built for iPads, hosted on GitHub Pages.

## What it does -
- Shows one question at a time with a touch keypad (no iPad keyboard needed; a physical keyboard also works).
- Wrong answers show "Niet helemaal. Probeer het nog eens!", keep the same question and do **not** count. Correct answers show "Juist!" and a **Volgende** (next) button.
- A session is exactly 20 correct answers, then a brief "Goed gedaan!" message and an automatic return to the home screen.
- A PIN lock screen appears on every page load; the home screen has a small Lock button.

## Technologies
Plain HTML, CSS and JavaScript. No dependencies, no build step. Tests use Node's built-in test runner.

## Run locally
Use a local web server (the lock screen needs a secure context, and `localhost` counts):
```
python3 -m http.server 8000
```
Then open http://localhost:8000. Run tests with `node --test` (Node 20 or newer).

## Publish on GitHub Pages
1. Create a repository on GitHub and upload all of these files, keeping the folder layout (including `.github/workflows/pages.yml`).
2. In the repository go to **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to the `main` branch. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to turn green.
4. Your URL is shown in **Settings → Pages**, usually `https://<your-username>.github.io/<repository-name>/`.

To publish changes, commit and push to `main`; the workflow runs the tests and redeploys. All file paths are relative, so any repository name works.

## Settings (`config.js`)
- `totalQuestions`: questions per session (default 20). Update the home-screen text in `index.html` and the "Well done" text if you change it.
- `lockEnabled`: `false` removes the lock screen.
- `pinSha256`: hash of the PIN. **The default PIN is 1234. Change it.** To make a hash for a new PIN, run in a terminal:
  `printf '2468' | shasum -a 256` (macOS/Linux), then paste the 64-character result.
- `finishDelayMs`: how long "Well done" shows.

## Lock screen limitations
The lock is a **simple barrier, not security**. GitHub Pages is static hosting, so the PIN check runs in the browser. Anyone who can open the page can read `config.js` and `app.js`, and can bypass or work out the PIN (short PINs are easy to guess from a hash). It stops accidental taps and casual use only. Real access control needs a server or login service in front of the site (for example a private hosting plan or an authentication proxy). The lock re-appears whenever the page is reloaded or reopened. No PIN is stored in the browser.

## Privacy: what is and isn't saved
The app keeps session state in JavaScript memory only. It does not use localStorage, sessionStorage, IndexedDB or cookies; it has no analytics, no external scripts or fonts, and sends nothing anywhere. Reloading clears everything. Scores and history are not shown or kept. GitHub, as the host, may keep ordinary server logs (such as IP addresses) outside the app's control.

## Files
`index.html`, `styles.css`, `app.js` (interface), `logic.js` (maths and session rules), `config.js` (settings), `tests/logic.test.js`.
