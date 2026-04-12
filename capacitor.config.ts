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
  ios: {
    backgroundColor: '#333333',
    contentInset: 'automatic',
    // iOS 横屏模式（地面控制站通常需要横屏）
    orientation: 'landscape',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#333333',
      showSpinner: true,
      spinnerColor: '#0486aa',
    },
    // iOS 网络安全配置：允许非 HTTPS 连接（局域网通信需要）
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
