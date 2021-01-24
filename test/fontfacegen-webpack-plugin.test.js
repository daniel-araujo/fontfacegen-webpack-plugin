const assert = require('assert');
const path = require('path');
const fs = require('fs');
const touch = require('touch');

const webpack = require('webpack');
const fse = require('fs-extra');

const FontfacegenWebpackPlugin = require('..');

const outputPath = path.join(__dirname, 'fontfacegen-webpack-plugin.test/build');

/**
 * Asynchronously waits for a predicate to be satisfied.
 * @param {Function} predicate - A function that must return a truthy value to
 * stop the wait.
 */
async function until(predicate) {
  const MAX_TRIES = 1000;
  let tries = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (predicate()) {
        clearInterval(interval);
        resolve();
      } else {
        tries += 1;

        if (tries > MAX_TRIES) {
          clearInterval(interval);
          reject();
        }
      }
    }, 10);
  });
}

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

async function runWithChildCompiler(options) {
  await createEntryStub();
  const compiler = webpack(getConfig(options));

  return new Promise((resolve, reject) => {
    compiler.hooks.make.tapPromise('runWithChildCompiler', async (compilation) => {
      const childCompiler = compilation.createChildCompiler("ChildCompiler");
      childCompiler.runAsChild((err, entries, childCompiletation) => {
        if (err) return reject(err);
      });
    });

    compiler.run((err, stats) => {
      if (err) return reject(err);
      resolve(stats);
    });
  });
}

async function watch(options) {
  await createEntryStub();

  class TestWatch {
    constructor() {
      const compiler = webpack(getConfig(options));

      // Array of promises that are waiting for a condition.
      this.waits = [];

      // Every time a successful compilation occurs, the stats object will be
      // pushed to this array.
      this.successfulCalls = [];

      // Every time an error occurs, the error object will be pushed to this
      // array.
      this.errorCalls = [];

      // Webpack's Watching instance.
      this.watching = compiler.watch(
        {
          // I tried small values but webpack would compile multiple times
          // unnecessarily. The aggregate timeout needs to be large. Must write
          // tests with this in mind.
          aggregateTimeout: 700
        },
        (err, stats) => {
          if (err) {
            this.errorCalls.push(err);
          } else {
            this.successfulCalls.push(stats);
          }
        }
      );
    }

    /**
     * Closes the Watching instance and returns a promise that gets resolved
     * when the watching instance is closed.
     */
    close() {
      return new Promise((resolve, reject) => {
        return this.watching.close(() => {
          resolve();
        });
      });
    }
  }

  return new TestWatch();
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

/**
 * Counts glyphs in svg file.
 * @param {string} svgFile
 * @returns {number}
 */
async function countGlyphsInSvg(svgFile) {
  let contents = await fs.promises.readFile(svgFile, 'utf8');
  return (contents.match(/<glyph /g) || []).length;
}

/**
 * Removes a file in the output directory.
 * @param {string} filename
 */
async function removeOutputFile(filename) {
  await fse.remove(path.join(outputPath, filename));
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

it('tasks array is copied', async () => {
  let tasks = [path.join(__dirname, 'karla', 'Karla-Regular.ttf')];

  let plugin = new FontfacegenWebpackPlugin({
    tasks: tasks
  });

  tasks.push(path.join(__dirname, 'karla', 'Karla-Bold.ttf'));

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
  assertResultsExist(plugin);
});

it('task object is copied', async () => {
  let task = {
    src: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')]
  };
  let tasks = [task];

  let plugin = new FontfacegenWebpackPlugin({
    tasks: tasks
  });

  task.src = [path.join(__dirname, 'karla', 'Karla-Bold.ttf')];

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
  assertResultsExist(plugin);
});

it('tasks src array is copied', async () => {
  let tasks = [
    {
      src: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')]
    }
  ];

  let plugin = new FontfacegenWebpackPlugin({
    tasks: tasks
  });

  tasks[0].src.push(path.join(__dirname, 'karla', 'Karla-Bold.ttf'));

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

it('supports subset as string', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')],
    subset: 'AB'
  });

  await run({
    plugins: [plugin],
  });

  assert.strictEqual(await countGlyphsInSvg(path.join(outputPath, 'Karla-Regular.svg')), 3);
});

it('supports subset as array', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')],
    subset: ['A', 'B']
  });

  await run({
    plugins: [plugin],
  });

  assert.strictEqual(await countGlyphsInSvg(path.join(outputPath, 'Karla-Regular.svg')), 3);
});

it('supports subset as string per task', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [
      {
        src: path.join(__dirname, 'karla', 'Karla-Regular.ttf'),
        subset: 'A'
      }
    ],
    subset: 'AB'
  });

  await run({
    plugins: [plugin],
  });

  assert.strictEqual(await countGlyphsInSvg(path.join(outputPath, 'Karla-Regular.svg')), 2);
});

it('supports subset as array per task', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [
      {
        src: path.join(__dirname, 'karla', 'Karla-Regular.ttf'),
        subset: ['A']
      }
    ],
    subset: 'AB'
  });

  await run({
    plugins: [plugin],
  });

  assert.strictEqual(await countGlyphsInSvg(path.join(outputPath, 'Karla-Regular.svg')), 2);
});

it.skip('watch: converts again when modification timestamp of source file is updated', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')],
    subset: 'A' // Better performance.
  });

  const testWatch = await watch({
    plugins: [plugin],
  });

  try {
    await until(() => testWatch.successfulCalls.length == 1);

    // The touch implementation that we're using sets milliseconds to 0.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    touch.sync(path.join(__dirname, 'karla', 'Karla-Regular.ttf'));

    await until(() => testWatch.successfulCalls.length == 2);

    assert.deepStrictEqual(plugin.lastResults(), [
      'Karla-Regular.eot',
      'Karla-Regular.ttf',
      'Karla-Regular.svg',
      'Karla-Regular.woff',
      'Karla-Regular.woff2',
    ]);
  } finally {
    await testWatch.close();
  }
});

it.skip('watch: recreates all generated files when one is missing', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')],
    subset: 'A' // Better performance.
  });

  const testWatch = await watch({
    plugins: [plugin],
  });

  try {
    await until(() => testWatch.successfulCalls.length == 1);

    assert.deepStrictEqual(plugin.lastResults(), [
      'Karla-Regular.eot',
      'Karla-Regular.ttf',
      'Karla-Regular.svg',
      'Karla-Regular.woff',
      'Karla-Regular.woff2',
    ]);

    await removeOutputFile('Karla-Regular.eot');

    await until(() => testWatch.successfulCalls.length == 2);

    assert.deepStrictEqual(plugin.lastResults(), [
      'Karla-Regular.eot',
      'Karla-Regular.ttf',
      'Karla-Regular.svg',
      'Karla-Regular.woff',
      'Karla-Regular.woff2',
    ]);
  } finally {
    await testWatch.close();
  }
});

it('bugfix: child compiler messes up internal state', async () => {
  let plugin = new FontfacegenWebpackPlugin({
    tasks: [path.join(__dirname, 'karla', 'Karla-Regular.ttf')],
    subset: 'A' // Better performance.
  });

  await runWithChildCompiler({
    plugins: [plugin],
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
