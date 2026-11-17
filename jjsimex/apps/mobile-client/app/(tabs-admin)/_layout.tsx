import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';

const ACCENT = '#22C55E';

function IcoDashboard({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="3" width="7" height="7" rx="1" /><Rect x="14" y="3" width="7" height="7" rx="1" /><Rect x="3" y="14" width="7" height="7" rx="1" /><Rect x="14" y="14" width="7" height="7" rx="1" /></Svg>;
}
function IcoPackage({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><Path d="m3.27 6.96 8.73 5.05 8.73-5.05" /><Path d="M12 22.08V12" /></Svg>;
}
function IcoQr() {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="3" width="7" height="7" rx="1" /><Rect x="14" y="3" width="7" height="7" rx="1" /><Rect x="3" y="14" width="7" height="7" rx="1" /><Line x1="14" y1="14" x2="14" y2="17" /><Line x1="21" y1="14" x2="21" y2="17" /><Line x1="14" y1="21" x2="17" y2="21" /><Line x1="21" y1="18" x2="21" y2="21" /></Svg>;
}
function IcoUsers({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M22 21v-2a4 4 0 0 0-3-3.87" /><Path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
}
function IcoSend({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Line x1="22" y1="2" x2="11" y2="13" /><Path d="M22 2 15 22l-4-9-9-4z" /></Svg>;
}
function IcoSettings({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><Circle cx="12" cy="12" r="3" /></Svg>;
}

function FloatingScanner() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs-admin)/scanner')}
      style={s.scannerBtn}
      activeOpacity={0.85}
    >
      <IcoQr />
    </TouchableOpacity>
  );
}

export default function AdminTabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 20,
            left: 16,
            right: 82,
            height: 64,
            backgroundColor: 'rgba(20,20,20,0.92)',
            borderRadius: 99,
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            paddingBottom: 0,
            paddingTop: 0,
            paddingHorizontal: 8,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
          },
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: '#666666',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2, marginBottom: 8 },
          tabBarIconStyle: { marginTop: 8 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <IcoDashboard color={color} /> }}
        />
        <Tabs.Screen
          name="colis"
          options={{ title: 'Colis', tabBarIcon: ({ color }) => <IcoPackage color={color} /> }}
        />
        <Tabs.Screen
          name="envoyer"
          options={{ title: 'Envois', tabBarIcon: ({ color }) => <IcoSend color={color} /> }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            title: '',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{ title: 'Clients', tabBarIcon: ({ color }) => <IcoUsers color={color} /> }}
        />
        <Tabs.Screen
          name="gestion"
          options={{ title: 'Gestion', tabBarIcon: ({ color }) => <IcoSettings color={color} /> }}
        />
      </Tabs>

      <FloatingScanner />
    </View>
  );
}

const s = StyleSheet.create({
  scannerBtn: {
    position: 'absolute',
    bottom: 22,
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
});
