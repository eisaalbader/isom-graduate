#!/usr/bin/env node
/* Render dist/*.html -> PDF + PNG preview via Playwright Chromium.
   Usage: node render.js mis            */
const { chromium } = require('playwright');
const path = require('path');
const name = process.argv[2] || 'mis';
const W = process.argv[3] || '594mm';
const H = process.argv[4] || '420mm';

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const p = await b.newPage({ viewport: { width: 2245, height: 1587 }, deviceScaleFactor: 2 });
  const url = 'file://' + path.join(__dirname, 'dist', name + '.html');
  await p.goto(url, { waitUntil: 'networkidle' });
  const hasWires = await p.$('#wires');
  if (hasWires) await p.waitForFunction(() => document.documentElement.getAttribute('data-wires') === 'done', { timeout: 15000 })
    .catch(() => console.warn('! connectors did not report done'));
  await p.waitForTimeout(400);
  await p.pdf({ path: path.join(__dirname, 'dist', name + '.pdf'), width: W, height: H, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const el = await p.$('.page') || await p.$('.cover');
  await el.screenshot({ path: path.join(__dirname, 'dist', name + '.png'), scale: 'css' });
  await b.close();
  console.log('rendered dist/' + name + '.pdf + .png');
})();
