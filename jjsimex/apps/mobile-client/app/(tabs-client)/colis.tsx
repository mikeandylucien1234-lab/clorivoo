import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getMyPackages, subscribeToPackages } from '@jjsimex/supabase/packages';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PackageCard } from '@/components/ui/PackageCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'En cours' },
  { key: 'delivered', label: 'Livrés' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pkg = any;

export default function ColisScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadPackages = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const result = await getMyPackages(session.user.id, { page: 1 });
      const pkgs = Array.isArray(result) ? result : result.data ?? [];
      setPackages(pkgs);
    } catch {}
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    loadPackages();
    if (!session?.user.id) return;
    const unsub = subscribeToPackages(() => loadPackages(), { client_id: session.user.id });
    return unsub;
  }, [loadPackages, session?.user.id]);

  async function onRefresh() {
    setRefreshing(true);
    await loadPackages();
    setRefreshing(false);
  }

  const filtered = packages.filter((p: Pkg) => {
    if (search && !p.tracking_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'active') return !['delivered', 'pending'].includes(p.status);
    if (filter === 'delivered') return p.status === 'delivered';
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('my_packages')}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder={t('search_tracking')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={[styles.filterRow, { borderBottomColor: colors.card }]}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterTab, { backgroundColor: colors.card, borderColor: colors.border }, filter === f.key && styles.filterTabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, { color: colors.textSecondary }, filter === f.key && styles.filterTextActive]}>{f.key === 'all' ? t('all') : f.key === 'active' ? t('active') : t('delivered_filter')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{loading ? t('loading') : t('no_packages')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('packages_appear_here')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
            <PackageCard pkg={item} onPress={() => router.push(`/colis/${item.id}`)} />
            {item.status === 'awaiting_arrival' && !item.carrier_tracking_number && (
              <TouchableOpacity
                style={styles.addTrackingBtn}
                onPress={() => router.push(`/screens/add-carrier-tracking?packageId=${item.id}&requestNumber=${item.request_number ?? item.tracking_number}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.addTrackingText}>{t('add_my_tracking')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  searchRow: { marginBottom: 12 },
  searchInput: { height: 44, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, color: '#FFFFFF', paddingHorizontal: 16, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  filterTabActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  filterTextActive: { color: '#FFFFFF' },
  list: { paddingTop: 16, paddingBottom: 30 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  addTrackingBtn: { marginTop: 8, marginHorizontal: 0, backgroundColor: '#22C55E', borderRadius: 10, paddingVertical: 10, alignItems: 'center' as const },
  addTrackingText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' as const },
});
