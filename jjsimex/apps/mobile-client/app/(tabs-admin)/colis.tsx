import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllPackages, updatePackageStatus, subscribeToPackages,
  type PackageStatus, type PackageFilters,
} from '@jjsimex/supabase/packages';
import { supabase } from '@/lib/supabase';
import {
  Package, User, MapPin, Filter, Search, Plus,
  Plane, Ship, ChevronRight,
} from 'lucide-react-native';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  awaiting_arrival: { label: 'En attente', bg: 'rgba(239,68,68,0.14)', color: '#EF4444' },
  received_usa: { label: 'Reçu USA', bg: '#2A2A2A', color: '#C9CDD3' },
  in_transit: { label: 'En transit', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  arrived: { label: 'Arrivé', bg: 'rgba(234,179,8,0.14)', color: '#EAB308' },
  ready_pickup: { label: 'Prêt retrait', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  delivered: { label: 'Livré ✓', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
};

const TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'received_usa', label: 'Reçu USA' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'arrived', label: 'Arrivé' },
  { key: 'ready_pickup', label: 'Prêt retrait' },
  { key: 'delivered', label: 'Livré' },
] as const;

const ALL_STATUSES: { key: PackageStatus; label: string }[] = [
  { key: 'awaiting_arrival', label: 'En attente' },
  { key: 'received_usa', label: 'Reçu USA' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'arrived', label: 'Arrivé' },
  { key: 'ready_pickup', label: 'Prêt retrait' },
  { key: 'delivered', label: 'Livré' },
];

export default function AdminColis() {
  const router = useRouter();
  const { session } = useAuth();
  const [tab, setTab] = useState('tous');
  const [packages, setPackages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const filters: PackageFilters = {};
      if (tab !== 'tous') filters.status = tab as PackageStatus;
      if (search.trim()) filters.search = search.trim();

      const result = await getAllPackages(filters);
      setPackages(result.packages);
      setTotal(result.total);

      if (tab === 'tous' && !search.trim()) {
        const counts: Record<string, number> = {};
        result.packages.forEach((p: any) => {
          counts[p.status] = (counts[p.status] ?? 0) + 1;
        });
        setStatusCounts(counts);
      }
    } catch {}
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const unsub = subscribeToPackages(() => fetchData());
    return unsub;
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function handlePickStatus(pkg: any, newStatus: PackageStatus) {
    if (!session?.user?.id) return;
    const newLabel = STATUS_MAP[newStatus]?.label ?? newStatus;
    setOpenPickerId(null);

    Alert.alert(
      'Changer le statut',
      `Passer "${pkg.tracking_number || pkg.id.substring(0, 12)}" à "${newLabel}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await updatePackageStatus(pkg.id, newStatus, '', session.user.id, supabase);
              fetchData();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ],
    );
  }

  function formatDate(d: string) {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    try {
      const dt = new Date(d);
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    } catch { return d; }
  }

  function clientName(pkg: any) {
    const u = pkg.users;
    if (!u) return '—';
    if (Array.isArray(u)) return u[0]?.first_name ? `${u[0].first_name} ${u[0].last_name ?? ''}`.trim() : '—';
    return u.first_name ? `${u.first_name} ${u.last_name ?? ''}`.trim() : '—';
  }

  const transitCount = statusCounts['in_transit'] ?? 0;
  const pendingCount = statusCounts['awaiting_arrival'] ?? 0;
  const deliveredCount = statusCounts['delivered'] ?? 0;

  return (
    <View style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* HEADER */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Colis</Text>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerBtn} onPress={() => setShowSearch(!showSearch)} activeOpacity={0.7}>
              <Filter size={17} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => setShowSearch(!showSearch)} activeOpacity={0.7}>
              <Search size={17} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR */}
        {showSearch && (
          <View style={s.searchWrap}>
            <Search size={16} color="#6B7280" strokeWidth={1.8} style={{ marginLeft: 14 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher un tracking..."
              placeholderTextColor="#6B7280"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}

        {/* STATS PILLS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
          <View style={s.pill}>
            <Text style={s.pillTextWhite}>Total : {total.toLocaleString()}</Text>
          </View>
          <View style={s.pill}>
            <Text style={s.pillTextGrey}>Transit </Text>
            <View style={[s.pillBadge, { backgroundColor: 'rgba(34,197,94,0.14)' }]}>
              <Text style={[s.pillBadgeText, { color: ACCENT }]}>{transitCount}</Text>
            </View>
          </View>
          <View style={s.pill}>
            <Text style={s.pillTextGrey}>Attente </Text>
            <View style={[s.pillBadge, { backgroundColor: 'rgba(239,68,68,0.14)' }]}>
              <Text style={[s.pillBadgeText, { color: '#EF4444' }]}>{pendingCount}</Text>
            </View>
          </View>
          <View style={s.pill}>
            <Text style={s.pillTextGrey}>Livrés </Text>
            <View style={[s.pillBadge, { backgroundColor: 'rgba(34,197,94,0.14)' }]}>
              <Text style={[s.pillBadgeText, { color: '#22C55E' }]}>{deliveredCount}</Text>
            </View>
          </View>
        </ScrollView>

        {/* TABS FILTRES */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 8, paddingTop: 16 }}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
              onPress={() => { setTab(t.key); setLoading(true); }}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* LISTE */}
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : packages.length === 0 ? (
          <Text style={s.emptyText}>Aucun colis trouvé.</Text>
        ) : (
          <View style={{ paddingHorizontal: 22, gap: 12, marginTop: 18 }}>
            {packages.map((pkg: any) => {
              const badge = STATUS_MAP[pkg.status] ?? STATUS_MAP.awaiting_arrival;
              const pickerOpen = openPickerId === pkg.id;
              return (
                <View key={pkg.id} style={s.card}>
                  {/* Top row: ID + badge + date */}
                  <View style={s.cardTop}>
                    <Text style={s.cardId}>{pkg.tracking_number || pkg.request_number || pkg.id.substring(0, 12)}</Text>
                    <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text style={s.cardDate}>{formatDate(pkg.created_at)}</Text>
                  </View>

                  {/* Divider */}
                  <View style={s.divider} />

                  {/* Info rows */}
                  <View style={{ gap: 7 }}>
                    <View style={s.infoRow}>
                      <User size={14} color="#6B7280" strokeWidth={1.8} />
                      <Text style={s.infoTextWhite}>{clientName(pkg)}</Text>
                    </View>
                    <View style={s.infoRow}>
                      <MapPin size={14} color="#6B7280" strokeWidth={1.8} />
                      <Text style={s.infoTextGrey}>{pkg.destination_city ?? '—'}, {pkg.destination_country === 'haiti' ? 'Haïti' : 'Rép. Dom.'}</Text>
                    </View>
                    <View style={s.infoRow}>
                      <Package size={14} color="#6B7280" strokeWidth={1.8} />
                      <Text style={s.infoTextGrey}>
                        {pkg.weight_billed ? pkg.weight_billed + ' lbs' : '—'} — {pkg.transport_mode === 'air' ? 'Avion' : 'Bateau'}
                      </Text>
                    </View>
                  </View>

                  {/* Buttons */}
                  <View style={s.cardBtns}>
                    <TouchableOpacity style={s.detailBtn} activeOpacity={0.7} onPress={() => {
                      const name = clientName(pkg);
                      const dest = `${pkg.destination_city ?? '—'}, ${pkg.destination_country === 'haiti' ? 'Haïti' : 'Rép. Dom.'}`;
                      const weight = pkg.weight_billed ? `${pkg.weight_billed} lbs` : '—';
                      const mode = pkg.transport_mode === 'air' ? 'Avion' : 'Bateau';
                      const tracking = pkg.tracking_number || pkg.request_number || '—';
                      const carrier = pkg.carrier_tracking_number ? `\nTracking transporteur: ${pkg.carrier_tracking_number}` : '';
                      Alert.alert(
                        tracking,
                        `Client: ${name}\nDestination: ${dest}\nPoids: ${weight}\nMode: ${mode}${carrier}\nCréé: ${formatDate(pkg.created_at)}`
                      );
                    }}>
                      <Text style={s.detailBtnText}>Voir détails</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: ACCENT }]}
                      onPress={() => setOpenPickerId(pickerOpen ? null : pkg.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={s.actionBtnTextDark}>Changer statut</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status picker dropdown */}
                  {pickerOpen && (
                    <View style={s.statusPickerWrap}>
                      {ALL_STATUSES.filter((st) => st.key !== pkg.status).map((st) => {
                        const stStyle = STATUS_MAP[st.key];
                        return (
                          <TouchableOpacity
                            key={st.key}
                            style={s.statusPickerItem}
                            onPress={() => handlePickStatus(pkg, st.key)}
                            activeOpacity={0.7}
                          >
                            <View style={[s.statusPickerDot, { backgroundColor: stStyle?.color ?? '#9CA3AF' }]} />
                            <Text style={s.statusPickerText}>{st.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => router.push('/(tabs-admin)/envoyer')}>
        <Plus size={24} color="#0D0D0D" strokeWidth={2.4} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: statusBarH + 10, paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    borderRadius: 12, marginHorizontal: 22, marginBottom: 14, height: 44,
  },
  searchInput: {
    flex: 1, color: '#FFFFFF', fontSize: 13, paddingHorizontal: 10, height: '100%',
  },

  pill: {
    flexDirection: 'row', alignItems: 'center', height: 38,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    borderRadius: 20, paddingHorizontal: 14, gap: 7,
  },
  pillTextWhite: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  pillTextGrey: { fontSize: 12, color: '#9CA3AF' },
  pillBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  pillBadgeText: { fontSize: 11, fontWeight: '700' },

  tabBtn: {
    height: 36, borderRadius: 99, paddingHorizontal: 15,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { fontWeight: '700', color: '#0D0D0D' },

  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 14, padding: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardId: { fontSize: 14, fontWeight: '700', color: ACCENT },
  cardDate: { fontSize: 11, color: '#6B7280' },

  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoTextWhite: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  infoTextGrey: { fontSize: 13, color: '#9CA3AF' },

  cardBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  detailBtn: {
    flex: 1, height: 40, backgroundColor: '#2A2A2A', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  detailBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  actionBtn: {
    flex: 1, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnTextDark: { fontSize: 12, fontWeight: '700', color: '#0D0D0D' },
  actionBtnTextLight: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  statusPickerWrap: {
    marginTop: 10, backgroundColor: '#222', borderRadius: 10,
    borderWidth: 1, borderColor: '#333', overflow: 'hidden',
  },
  statusPickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  statusPickerDot: { width: 8, height: 8, borderRadius: 4 },
  statusPickerText: { fontSize: 13, fontWeight: '500', color: '#FFFFFF' },

  fab: {
    position: 'absolute', right: 20, bottom: 104,
    width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    elevation: 20,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 24,
  },
});
