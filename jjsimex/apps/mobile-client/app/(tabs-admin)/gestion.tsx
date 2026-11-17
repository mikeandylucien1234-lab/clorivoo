import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Plane, CreditCard, Bell, User, LogOut } from 'lucide-react-native';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const MENU_ITEMS = [
  { icon: ShoppingCart, label: 'Personal Shopper', sub: 'Demandes en cours', route: '/screens/admin-personal-shopper' },
  { icon: Plane, label: 'Départs', sub: 'Gérer les vols et bateaux', route: '/screens/admin-departs' },
  { icon: CreditCard, label: 'Paiements', sub: 'Suivi des paiements', route: '/screens/admin-paiements' },
  { icon: Bell, label: 'Notifications', sub: 'Envoyer des notifications', route: '/screens/admin-notifications' },
  { icon: User, label: 'Mon profil', sub: 'Paramètres du compte', route: '/screens/admin-profil' },
];

export default function AdminGestion() {
  const router = useRouter();
  const { signOut, profile } = useAuth();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Gestion</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(profile?.full_name || 'A')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{profile?.full_name || 'Admin'}</Text>
            <Text style={s.profileRole}>{profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'employee' ? 'Employé' : 'Admin'}</Text>
          </View>
        </View>

        <View style={{ gap: 2, marginTop: 20 }}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={s.menuItem} onPress={() => router.push(item.route as any)} activeOpacity={0.7}>
              <View style={s.menuIcon}>
                <item.icon size={20} color={ACCENT} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Text style={{ color: '#4B5563', fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.sep} />

        <TouchableOpacity style={s.menuItem} onPress={() => router.replace('/(tabs-client)/')} activeOpacity={0.7}>
          <View style={[s.menuIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <User size={20} color="#60A5FA" strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.menuLabel}>Mode Client</Text>
            <Text style={s.menuSub}>Basculer vers l'app client</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={signOut} activeOpacity={0.7}>
          <LogOut size={18} color="#EF4444" strokeWidth={1.8} />
          <Text style={s.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    paddingHorizontal: 18, paddingTop: statusBarH + 10, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1F1F1F',
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#0D0D0D' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  profileRole: { fontSize: 12, color: ACCENT, fontWeight: '600', marginTop: 2 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    borderRadius: 12,
  },
  menuIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  menuSub: { fontSize: 11.5, color: '#9CA3AF', marginTop: 2 },
  sep: { height: 1, backgroundColor: '#1F1F1F', marginVertical: 8 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 20, padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
