# fontfacegen-webpack-plugin

This plugin allows you to convert .ttf and .otf files into various other font
formats such as .eot, .ttf, .svg, .woff and .woff2 using the existing NPM
package `fontfacegen`.

```
               fontfacegen
fontfile.ttf ---------------> fontfile.ttf
                              fontfile.eot
                              fontfile.svg
                              fontfile.woff
                              fontfile.woff2
```


## Install

```
npm install fontfacegen
npm install fontfacegen-webpack-plugin
```


## Usage

Require the module  `fontfacegen-webpack-plugin`, create an instance of
`FontfacegenWebpackPlugin` and pass the instance to the plugins array.

```js
const FontfacegenWebpackPlugin = require('fontfacegen-webpack-plugin')

module.exports = {
  entry: 'index.js',
  output: {
    path: 'dist',
    filename: 'index_bundle.js'
  },
  plugins: [
    new FontfacegenWebpackPlugin({ tasks: ['fontfile.ttf', 'anotherfont.otf'] })
  ]
}
```

This will generate the following files:

- `dist/fontfile.eot`
- `dist/fontfile.ttf`
- `dist/fontfile.svg`
- `dist/fontfile.woff`
- `dist/fontfile.woff2`
- `dist/anotherfont.eot`
- `dist/anotherfont.ttf`
- `dist/anotherfont.svg`
- `dist/anotherfont.woff`
- `dist/anotherfont.woff2`

You can then reference these files in your code.

```css
@font-face {
  src: url("dist/fontfile.eot");
  src: url("dist/fontfile.eot?#iefix") format("embedded-opentype"),
    url("dist/fontfile.woff2") format("woff2"),
    url("dist/fontfile.woff") format("woff"),
    url("dist/fontfile.ttf") format("ttf"),
    url("dist/fontfile.svg") format("svg");
  font-family: fontfile;
  font-style: normal;
  font-weight: normal;
}

@font-face {
  src: url("dist/anotherfont.eot");
  src: url("dist/anotherfont.eot?#iefix") format("embedded-opentype"),
    url("dist/anotherfont.woff2") format("woff2"),
    url("dist/anotherfont.woff") format("woff"),
    url("dist/anotherfont.ttf") format("ttf"),
    url("dist/anotherfont.svg") format("svg");
  font-family: anotherfont;
  font-style: normal;
  font-weight: normal;
}
```


## Documentation

The `fontfacegen-webpack-plugin` module default exports a single class:
`FontfacegenWebpackPlugin`

An instance of this object is passed to the plugins array of webpack's config
options.

The constructor takes an object as its first argument:

| Property | Description                                                                                 |
|----------|---------------------------------------------------------------------------------------------|
| tasks    | Array of directories or file paths.                                                         |
|          | - Directory: Files with the extension `.ttf` and `.otf` in the directory will be converted. |
|          | - File. That single file will be converted.                                                 |
| subset   | A string or array with the characters desired to be included inside the generated fonts.    |


## Contributing

The easiest way to contribute is by starring this project on GitHub!

https://github.com/daniel-araujo/fontfacegen-webpack-plugin

If you've found a bug, would like to suggest a feature or need some help, feel
free to create an issue on GitHub:

https://github.com/daniel-araujo/fontfacegen-webpack-plugin/issues
