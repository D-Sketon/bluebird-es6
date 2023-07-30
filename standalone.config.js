import cleanup from 'rollup-plugin-cleanup';
import terser from "@rollup/plugin-terser";

export default {
  input: 'src/bluebird.js',
  output: {
    file: 'bluebird.cjs',
    format: 'cjs',
  },
  plugins: [cleanup()],
  external: ['async_hooks']
};