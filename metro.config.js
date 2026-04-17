const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Don't watch the Cloudflare worker's build artefacts. Wrangler writes
// short-lived files into workers/broker/.wrangler/tmp/ during dev, and Metro's
// recursive watcher crashes with ENOENT when those files vanish between the
// stat() and the watch() syscalls. The worker is a totally separate runtime —
// Metro never needs to bundle anything from it.
const blockedDirs = [
  /workers[\\/]broker[\\/]\.wrangler[\\/].*/,
  /workers[\\/]broker[\\/]node_modules[\\/].*/,
];

config.resolver = config.resolver || {};
config.resolver.blockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? [...config.resolver.blockList, ...blockedDirs]
    : [config.resolver.blockList, ...blockedDirs]
  : blockedDirs;

// Older Metro versions used `resolver.blacklistRE`; populate both so this
// works regardless of which Metro version Expo ships.
config.resolver.blacklistRE = config.resolver.blockList;

module.exports = withNativeWind(config, { input: "./global.css" });
