import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2044ec5bcc4a420f94f23f05879412b5',
  appName: 'Lokala Hantverkarna',
  webDir: 'dist',
  server: {
    url: 'https://2044ec5b-cc4a-420f-94f2-3f05879412b5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    BackgroundGeolocation: {
      // notification configured at runtime via addWatcher
    }
  }
};

export default config;