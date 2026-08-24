// REPL driver for the SmartVault frontend, modeled loosely on the
// chromium-cli command vocabulary (nav / wait-for / click / fill / press /
// screenshot / console). Reads one command per line from stdin.
//
// Usage:
//   node driver.mjs [baseURL] <<'EOF'
//   nav /gateways
//   wait-for text=게이트웨이 관리
//   screenshot list
//   EOF
//
// Screenshots are written to ./screenshots/<name>.png (relative to cwd).

import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { mkdirSync } from 'node:fs';

const baseURL = process.argv[2] || 'http://localhost:3000';
const screenshotDir = 'screenshots';
mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

// window.confirm()/alert() block the page forever unless answered.
// The gateway delete button uses window.confirm, so auto-accept everything.
page.on('dialog', (dialog) => dialog.accept());

function splitFirst(str, sep) {
  const i = str.indexOf(sep);
  return i === -1 ? [str, ''] : [str.slice(0, i), str.slice(i + sep.length)];
}

async function run(line) {
  const [cmd, rest] = splitFirst(line.trim(), ' ');
  if (!cmd) return;

  switch (cmd) {
    case 'nav': {
      const url = rest.startsWith('http') ? rest : baseURL + rest;
      await page.goto(url, { waitUntil: 'load' });
      console.log(`OK nav ${url}`);
      break;
    }
    case 'wait-for': {
      await page.locator(rest).first().waitFor({ timeout: 15000 });
      console.log(`OK wait-for ${rest}`);
      break;
    }
    case 'click': {
      await page.locator(rest).first().click();
      console.log(`OK click ${rest}`);
      break;
    }
    case 'fill': {
      const [selector, value] = splitFirst(rest, ' ');
      await page.locator(selector).first().fill(value);
      console.log(`OK fill ${selector} = ${value}`);
      break;
    }
    case 'select': {
      // For native <select> elements — use this, not click+press arrows.
      // Arrow-key navigation from a placeholder <option> lands on whichever
      // option the keyboard-focus algorithm picks, which is easy to get
      // wrong by one and have it silently select the neighboring option.
      const [selector, value] = splitFirst(rest, ' ');
      await page.locator(selector).first().selectOption(value);
      console.log(`OK select ${selector} = ${value}`);
      break;
    }
    case 'press': {
      await page.keyboard.press(rest);
      console.log(`OK press ${rest}`);
      break;
    }
    case 'screenshot': {
      const name = rest || String(Date.now());
      const path = `${screenshotDir}/${name}.png`;
      await page.screenshot({ path, fullPage: true });
      console.log(`OK screenshot ${path}`);
      break;
    }
    case 'console': {
      console.log('CONSOLE_ERRORS=' + JSON.stringify(consoleErrors));
      break;
    }
    case 'quit': {
      await browser.close();
      process.exit(0);
    }
    default:
      console.log(`ERR unknown command: ${cmd}`);
  }
}

// readline emits 'line' for every buffered line as soon as stdin closes
// (which is how a heredoc arrives), so commands must be chained, not
// fired off in parallel, or `nav` and the following `wait-for` race.
let queue = Promise.resolve();
const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  queue = queue.then(() =>
    run(line).catch((err) => {
      console.log(`ERR ${err.message.split('\n')[0]}`);
    })
  );
});
rl.on('close', async () => {
  await queue;
  await browser.close();
});
