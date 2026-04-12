import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.bluerobotics.cockpit',
  appName: 'Cockpit',
  webDir: 'dist',
  server: {
    // 开发模式时可以连接到 Vite dev server
    // url: 'http://192.168.x.x:5173', // 取消注释以使用实时重载开发模式
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    backgroundColor: '#333333',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#333333',
      showSpinner: true,
      spinnerColor: '#0486aa',
    },
  },
};

export default config;
