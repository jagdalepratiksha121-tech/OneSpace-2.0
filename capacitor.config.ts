// Capacitor configuration ready for Android native build (`npx cap add android`)
export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme: string;
  };
  plugins?: {
    StatusBar?: {
      style: string;
      backgroundColor: string;
    };
  };
}

const config: CapacitorConfig = {
  appId: 'app.onespace.life',
  appName: 'OneSpace 2.0',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#234658',
    },
  },
};

export default config;
