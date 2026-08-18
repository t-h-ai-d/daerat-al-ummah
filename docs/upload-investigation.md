# Upload repair record

On 2026-08-18, the Render application log recorded `PayloadTooLargeError: request entity too large` while a member attempted an upload. The live service was configured with a 50 MB JSON parser, while a permitted 50 MB binary attachment expands to roughly 67 MB when encoded as base64 for the tRPC JSON request.

The repair raises the parser ceiling to 70 MB while preserving the 50 MB decoded attachment cap and adding matching browser-side checks. After the independent Render deployment completes, validate with a small image first, then with an ordinary attachment below 50 MB.

Source: Render application log for [daerat-al-ummah](https://dashboard.render.com/web/srv-da23q3ajnfac73aipsm0/logs), observed 2026-08-18.
