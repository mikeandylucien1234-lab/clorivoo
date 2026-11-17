import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Circle, Polyline, Rect, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

function IcoHome({ color, filled }: { color: string; filled?: boolean }) {
  if (filled) return <Svg width={24} height={24} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>;
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Polyline points="9 22 9 12 15 12 15 22" /></Svg>;
}
function IcoOrders({ color, filled }: { color: string; filled?: boolean }) {
  if (filled) return <Svg width={24} height={24} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></Svg>;
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><Path d="m3.27 6.96 8.73 5.05 8.73-5.05" /><Path d="M12 22.08V12" /></Svg>;
}
function IcoMembership({ color, filled }: { color: string; filled?: boolean }) {
  if (filled) return <Svg width={24} height={24} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></Svg>;
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></Svg>;
}
function IcoProfile({ color, filled }: { color: string; filled?: boolean }) {
  if (filled) return <Svg width={24} height={24} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5"><Circle cx="12" cy="7" r="4" /><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /></Svg>;
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" /></Svg>;
}

function IcoQr() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="3" width="7" height="7" rx="1" /><Rect x="14" y="3" width="7" height="7" rx="1" /><Rect x="3" y="14" width="7" height="7" rx="1" /><Line x1="14" y1="14" x2="14" y2="17" /><Line x1="21" y1="14" x2="21" y2="17" /><Line x1="14" y1="21" x2="17" y2="21" /><Line x1="21" y1="18" x2="21" y2="21" /></Svg>;
}

function FloatingScanner() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs-client)/scanner')}
      style={[s.scannerBtn, { backgroundColor: colors.accent }]}
      activeOpacity={0.85}
    >
      <IcoQr />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: Platform.OS === 'ios' ? 88 : 68,
            backgroundColor: colors.tabBar,
            borderTopWidth: 1,
            borderTopColor: colors.tabBarBorder,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
            elevation: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('home'),
            tabBarIcon: ({ color, focused }) => <IcoHome color={color} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="colis"
          options={{
            title: t('my_packages'),
            tabBarIcon: ({ color, focused }) => <IcoOrders color={color} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{ title: '', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="notifications"
          options={{ title: '', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="envoyer"
          options={{ title: '', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="membership"
          options={{
            title: 'Membership',
            tabBarIcon: ({ color, focused }) => <IcoMembership color={color} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: t('profile'),
            tabBarIcon: ({ color, focused }) => <IcoProfile color={color} filled={focused} />,
          }}
        />
      </Tabs>

      <FloatingScanner />
    </View>
  );
}

const s = StyleSheet.create({
  scannerBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 76,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});
