import { Plugin } from 'webpack';

interface FontfacegenWebpackPluginOptions {
  tasks: string[];
}

declare class FontfacegenWebpackPlugin implements Plugin {
  constructor(options: FontfacegenWebpackPluginOptions);
}

export = FontfacegenWebpackPlugin;
