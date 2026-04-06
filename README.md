# Intercept
Manage HTTP request headers, URL redirects, and URL filters with multiple profiles.

![Product Screen Shot][product-screenshot]

## Install
1. Clone repository
   ```sh
   git clone https://github.com/EmperorWasTaken/Intercept.git
   cd Intercept
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Build the extension
   ```sh
   npm run build
   ```
4. Load in Chromium browsers (Edge/Chrome)
   - Open `edge://extensions/` or `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `/dist/chromium` folder from the repository
5. Build for Firefox
   ```sh
   npm run build:firefox
   ```
   - Load as temporary add-on in `about:debugging#/runtime/this-firefox` (select `dist/firefox/manifest.json`)
5. ???
6. Profit

[product-screenshot]: images/image.png