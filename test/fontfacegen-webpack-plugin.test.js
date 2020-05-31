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

  const options = {
    plugins: [
      new FontfacegenWebpackPlugin({ tasks: [emptyDir] })
    ]
  };

  let stats = await run(options);

  assert(Object.keys(stats.compilation.assets).length === 1);
})