// Vite config
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'dev'; }
})();

/**
 * Parse CHANGELOG.md into an array of { version, date, added[], fixed[] }.
 * Handles sections: ## [X.Y.Z] — date  and  ## [Unreleased] — date
 */
function parseChangelog() {
  try {
    const md = readFileSync(resolve(__dirname, '../CHANGELOG.md'), 'utf-8');
    const entries = [];
    let current = null;
    let section = null;

    for (const raw of md.split('\n')) {
      const line = raw.trim();

      // New release section: ## [0.1.2] — 2026-05-04  or  ## [Unreleased] — 2026-05-04
      const h2 = line.match(/^##\s+\[([^\]]+)\](?:\s*[—-]\s*(\S+))?/);
      if (h2) {
        if (current) entries.push(current);
        current = { version: h2[1], date: h2[2] ?? '', added: [], fixed: [] };
        section = null;
        continue;
      }
      if (!current) continue;

      // Sub-section: ### Added / ### Fixed
      if (/^###\s+Added/i.test(line)) { section = 'added'; continue; }
      if (/^###\s+Fixed/i.test(line)) { section = 'fixed'; continue; }
      if (/^###/.test(line)) { section = null; continue; }

      // List item
      const item = line.match(/^[-*]\s+(.+)/);
      if (item && section && current[section]) {
        current[section].push(item[1]);
      }
    }
    if (current) entries.push(current);
    return entries;
  } catch {
    return [];
  }
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  define: {
    __APP_VERSION__: JSON.stringify(`${version}+${gitHash}`),
    __CHANGELOG__: JSON.stringify(parseChangelog()),
  },
});
