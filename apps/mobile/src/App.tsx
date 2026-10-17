import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { colors } from './theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.navy900, card: colors.parchment, text: colors.navy900, border: colors.line },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  React.useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <WebFrame>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme} documentTitle={{ formatter: () => 'WisePath' }}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </WebFrame>
  );
}

/** In the browser preview, show the app in a phone-width column instead of stretching it across the screen. */
function WebFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={webStyles.page}>
      <View style={webStyles.phone}>{children}</View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.navy900 },
  phone: { flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden', backgroundColor: colors.background },
});
