# Safari first-screen boot split

The initial HTML boot now starts only the core `preview.js` runtime plus a deferred optional-UI loader. Presentation, Party/Storage, sprite and trainer UI modules are imported after window load/idle time, one at a time. `camp-presentation.js` is no longer a side-effect import of the AI runtime wrapper.

Goal: reach the first Day Board before optional UI modules initialize on iPhone Safari.
