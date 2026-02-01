const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const emptyModulePath = require.resolve('metro-runtime/src/modules/empty-module.js');
const functionsStubPath = path.join(projectRoot, 'metro-stubs', 'functions');
const realFunctionsDir = path.join(projectRoot, 'functions');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Expo SDK 53: отключаем новое разрешение экспортов — иначе Firebase Auth даёт "Component auth has not been registered yet"
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs'];
config.resolver.unstable_enablePackageExports = false;

// Redirect "functions" в stub + firebase/app, firebase/auth в @firebase/* (RN-сборки)
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  functions: functionsStubPath,
  'firebase/app': require.resolve('@firebase/app'),
  'firebase/auth': require.resolve('@firebase/auth'),
};

// Exclude real Firebase Cloud Functions dir only (do not block metro-stubs/functions)
const realFunctionsEscaped = realFunctionsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  new RegExp('^' + realFunctionsEscaped + '[/\\\\].*'),
];

// Fallback: resolveRequest returns empty module for any path under functions/ or ./lib/index from root
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath || '';
  const originDir = path.dirname(origin);
  const isFromRoot = originDir === projectRoot || path.normalize(origin) === path.join(projectRoot, '.');
  const isLibIndex = moduleName === './lib/index' || moduleName === 'lib/index';
  if (isFromRoot && isLibIndex) {
    return { type: 'sourceFile', filePath: emptyModulePath };
  }
  try {
    const resolved = path.resolve(originDir, moduleName);
    if (resolved === realFunctionsDir || resolved.startsWith(realFunctionsDir + path.sep)) {
      return { type: 'sourceFile', filePath: emptyModulePath };
    }
  } catch (_) {}
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
