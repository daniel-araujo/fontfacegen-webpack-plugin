import { Plugin } from 'webpack';

interface FontfacegenPluginOptions {
  tasks: string[];
}

export interface FontfacegenPlugin {
  new (options: FontfacegenPluginOptions): Plugin;
}
