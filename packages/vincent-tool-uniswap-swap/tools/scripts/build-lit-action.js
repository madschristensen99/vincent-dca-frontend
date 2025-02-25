const esbuild = require('esbuild');
const path = require('path');

async function buildFile(entryPoint, outfile, network) {
  try {
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      // minify: true,
      format: 'iife',
      globalName: 'LitAction',
      outfile,
      define: {
        'process.env.NETWORK': `"${network}"`,
      },
      target: ['es2020'],
    });
    console.log(
      `Successfully built ${path.basename(entryPoint)} for network: ${network}`
    );
  } catch (error) {
    console.error(`Error building ${path.basename(entryPoint)}:`, error);
    process.exit(1);
  }
}

async function buildAction(network) {
  const mainEntryPoint = path.resolve(
    __dirname,
    '../../src/lib/lit-action/tool.mts'
  );

  const mainOutfile = path.resolve(
    __dirname,
    '../../dist',
    `deployed-lit-action-${network}.js`
  );

  await Promise.all([buildFile(mainEntryPoint, mainOutfile, network)]);
}

// Build for each network
Promise.all([buildAction('datil')]).catch(() => process.exit(1));
