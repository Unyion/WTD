const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

function runGit(args) {
  return execFileSync('git', args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

function getBuildVersion() {
  try {
    const exactTag = runGit(['describe', '--tags', '--exact-match']);
    return exactTag.replace(/^v/, '');
  } catch {
    try {
      const tags = runGit(['tag', '--sort=-v:refname']).split(/\r?\n/).filter(Boolean);
      if (tags.length > 0) {
        return tags[0].replace(/^v/, '');
      }
    } catch {
      // Fall back to package.json version if git tags are unavailable.
    }

    return require(path.resolve(__dirname, '..', 'package.json')).version;
  }
}

const projectRoot = path.resolve(__dirname, '..');
const builderBin = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

const buildVersion = getBuildVersion();
const cliArgs = [
  '--publish=never',
  `-c.extraMetadata.version=${buildVersion}`,
  ...process.argv.slice(2)
];

console.log(`Building installers with version ${buildVersion}`);

function quoteWindowsArg(arg) {
  if (!/[\s"]/u.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/"/g, '\\"')}"`;
}

const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : builderBin;
const spawnArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', [builderBin, ...cliArgs].map(quoteWindowsArg).join(' ')]
  : cliArgs;

const result = spawnSync(spawnCommand, spawnArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: false
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);