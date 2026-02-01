// Ensure global exists before any other code (fixes Android "Global was not installed" when bundle runs before native sets it)
if (typeof global === 'undefined') {
  try {
    const g = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {};
    if (g && typeof g === 'object') g.global = g;
  } catch (_) {}
}

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
