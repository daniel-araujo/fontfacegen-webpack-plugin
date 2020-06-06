const assert = require('assert');
const path = require('path');

const webpack = require('webpack');
const fse = require('fs-extra');

const FontfacegenWebpackPlugin = require('..');

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
      path: path.join(__dirname, 'fontfacegen-webpack-plugin.test/build'),
    },
    ...options
  };
}

async function createEntryStub() {
  await fse.ensureDir(path.join(__dirname, 'fontfacegen-webpack-plugin.test'));
  await fse.promises.writeFile(path.join(__dirname, 'fontfacegen-webpack-plugin.test/entry.js'), '', 'utf8');
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
});