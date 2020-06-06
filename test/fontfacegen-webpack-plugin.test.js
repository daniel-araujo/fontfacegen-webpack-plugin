const assert = require('assert');
const path = require('path');
const fs = require('fs');

const webpack = require('webpack');
const fse = require('fs-extra');

const FontfacegenWebpackPlugin = require('..');

const outputPath = path.join(__dirname, 'fontfacegen-webpack-plugin.test/build');

async function run(options) {
  await createEntryStub();
  const compiler = webpack(getConfig(options));
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err);
      resolve(stats);
    });
  });
}

function getConfig(options = {}) {
  return {
    mode: 'development',
    entry: path.join(__dirname, 'fontfacegen-webpack-plugin.test/entry.js'),
    output: {
      path: outputPath,
    },
    ...options
  };
}

async function createEntryStub() {
  await fse.ensureDir(path.join(__dirname, 'fontfacegen-webpack-plugin.test'));
  await fse.promises.writeFile(path.join(__dirname, 'fontfacegen-webpack-plugin.test/entry.js'), '', 'utf8');
}

/**
 * Verifies if results actually exist on the file system.
 * @param {FontfacegenWebpackPlugin} plugin
 */
function assertResultsExist(plugin) {
  for (let file of plugin.lastResults()) {
    let fullPath = path.join(outputPath, file);

    assert(fs.existsSync(fullPath));
  }
}

beforeEach(async () => {
  await fse.remove(path.join(__dirname, 'fontfacegen-webpack-plugin.test'));
});

it('does nothing if directory contains no fonts', async () => {
  let emptyDir = path.join(__dirname, 'fontfacegen-webpack-plugin.test/empty-directory');

  await fse.ensureDir(emptyDir);

  let plugin = new FontfacegenWebpackPlugin({ tasks: [emptyDir] });

  await run({
    plugins: [plugin]
  });

  assert.deepStrictEqual(plugin.lastResults(), []);
});

it('converts ttf file', async () => {
  let plugin = new FontfacegenWebpackPlugin({ tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')] });

  await run({
    plugins: [plugin]
  });

  assert.deepStrictEqual(plugin.lastResults(), [
    'Karla-Regular.eot',
    'Karla-Regular.ttf',
    'Karla-Regular.svg',
    'Karla-Regular.woff',
    'Karla-Regular.woff2'
  ]);
  assertResultsExist(plugin);
});

it('does not convert font file if it had already been converted', async () => {
  let plugin = new FontfacegenWebpackPlugin({ tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')] });

  await run({
    plugins: [plugin]
  });

  // Second run.
  await run({
    plugins: [plugin]
  });

  assert.deepStrictEqual(plugin.lastResults(), []);
});

it('converts font file if source modification date is newer than any generated file', async () => {
  let sourceFile = path.join(__dirname, 'karla', 'Karla-Regular.ttf');
  let plugin = new FontfacegenWebpackPlugin({ tasks: [sourceFile] });

  await run({
    plugins: [plugin]
  });

  let files = plugin.lastResults();

  for (let file of files) {
    let now = new Date();

    for (let file of files) {
      // The other files.
      let fullPath = path.join(outputPath, file);
      fs.utimesSync(fullPath, new Date(now.getTime() + 1), new Date(now.getTime() + 1));
    }

    // Current file.
    let fullPath = path.join(outputPath, file);
    fs.utimesSync(fullPath, new Date(now.getTime() - 1), new Date(now.getTime() - 1));

    // Source file will be newer than the current file but older than the other
    // files.
    fs.utimesSync(sourceFile, now, now);

    await run({
      plugins: [plugin]
    });

    assert.deepStrictEqual(plugin.lastResults(), [
      'Karla-Regular.eot',
      'Karla-Regular.ttf',
      'Karla-Regular.svg',
      'Karla-Regular.woff',
      'Karla-Regular.woff2',
    ]);
  }
});

it('a task can have multiple sources', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [
      {
        src: [
          path.join(__dirname, 'karla', 'Karla-Regular.ttf'),
          path.join(__dirname, 'karla', 'Karla-Bold.ttf')
        ]
      }
    ]
  });

  await run({
    plugins: [plugin]
  });

  assert.deepStrictEqual(plugin.lastResults(), [
    'Karla-Regular.eot',
    'Karla-Regular.ttf',
    'Karla-Regular.svg',
    'Karla-Regular.woff',
    'Karla-Regular.woff2',
    'Karla-Bold.eot',
    'Karla-Bold.ttf',
    'Karla-Bold.svg',
    'Karla-Bold.woff',
    'Karla-Bold.woff2'
  ]);
  assertResultsExist(plugin);
});

it('converts two tasks', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [
      path.join(__dirname, 'karla', 'Karla-Regular.ttf'),
      path.join(__dirname, 'karla', 'Karla-Bold.ttf')
    ]
  });

  await run({
    plugins: [plugin]
  });

  assert.deepStrictEqual(plugin.lastResults(), [
    'Karla-Regular.eot',
    'Karla-Regular.ttf',
    'Karla-Regular.svg',
    'Karla-Regular.woff',
    'Karla-Regular.woff2',
    'Karla-Bold.eot',
    'Karla-Bold.ttf',
    'Karla-Bold.svg',
    'Karla-Bold.woff',
    'Karla-Bold.woff2'
  ]);
  assertResultsExist(plugin);
});

it('array of tasks is equivalent to an array of objects with just the src property', async () => {
  {
    let plugin = new FontfacegenWebpackPlugin({ tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')] });

    await run({
      plugins: [plugin]
    });

    assert.deepStrictEqual(plugin.lastResults(), [
      'Karla-Regular.eot',
      'Karla-Regular.ttf',
      'Karla-Regular.svg',
      'Karla-Regular.woff',
      'Karla-Regular.woff2'
    ]);
    assertResultsExist(plugin);
  }

  {
    let plugin = new FontfacegenWebpackPlugin({
      tasks: [
        {
          src: path.join(__dirname, 'karla', 'Karla-Bold.ttf')
        }
      ]
    });

    await run({
      plugins: [plugin]
    });

    assert.deepStrictEqual(plugin.lastResults(), [
      'Karla-Bold.eot',
      'Karla-Bold.ttf',
      'Karla-Bold.svg',
      'Karla-Bold.woff',
      'Karla-Bold.woff2'
    ]);
    assertResultsExist(plugin);
  }
});

it('converts every ttf file inside directory', async () => {
  let plugin = new FontfacegenWebpackPlugin({ tasks: [path.join(__dirname, 'karla')] });

  await run({
    plugins: [plugin]
  });

  assert.deepStrictEqual(plugin.lastResults(), [
    'Karla-Bold.eot',
    'Karla-Bold.ttf',
    'Karla-Bold.svg',
    'Karla-Bold.woff',
    'Karla-Bold.woff2',
    'Karla-BoldItalic.eot',
    'Karla-BoldItalic.ttf',
    'Karla-BoldItalic.svg',
    'Karla-BoldItalic.woff',
    'Karla-BoldItalic.woff2',
    'Karla-Italic.eot',
    'Karla-Italic.ttf',
    'Karla-Italic.svg',
    'Karla-Italic.woff',
    'Karla-Italic.woff2',
    'Karla-Regular.eot',
    'Karla-Regular.ttf',
    'Karla-Regular.svg',
    'Karla-Regular.woff',
    'Karla-Regular.woff2'
  ]);
  assertResultsExist(plugin);
});