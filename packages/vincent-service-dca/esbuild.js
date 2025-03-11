import esbuild from 'esbuild';

const buildConfigs = [
  {
    bundle: true,
    entryPoints: ['src/lib/server.ts'],
    format: 'esm',
    outfile: 'dist/server.mjs',
    platform: 'node',
  },
];

Promise.all(
  buildConfigs.map((config) =>
    esbuild.build(config).catch((err) => {
      console.error(`Failed to build ${config.entryPoints}`);
      throw err;
    })
  )
).then(() => {
  console.log('Builds completed successfully');
});
