import typescript from '@rollup/plugin-typescript';

export default {
    input: 'main.ts',
    output: {
        dir: 'dist',
        format: 'cjs'
    },
    external: ['obsidian'],
    plugins: [typescript()]
};
