import { registerRootComponent } from 'expo';
import { installCrashHandler, Root } from './src/crash';

// Installed before the app's own modules load (Root requires ./src/App lazily), so a startup error
// shows the crash screen instead of silently closing the app.
installCrashHandler();
registerRootComponent(Root);
