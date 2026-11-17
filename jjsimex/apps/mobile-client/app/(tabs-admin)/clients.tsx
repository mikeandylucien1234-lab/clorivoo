import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  Search, Filter, Package, DollarSign, Award,
} from 'lucide-react-native';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'inactif', label: 'Inactifs' },
  { key: 'bloque', label: 'Bloqués' },
] as const;

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  actif: { label: 'Actif', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  inactif: { label: 'Inactif', bg: '#2A2A2A', color: '#C9CDD3' },
  bloque: { label: 'Bloqué', bg: 'rgba(239,68,68,0.14)', color: '#EF4444' },
};

const AVATAR_COLORS = ['#22C55E', '#1E3A5F', '#3B2A5F', '#14532D', '#5F1E1E', '#0D4F6B', '#6B3A0D', '#2A1A5F'];
const AVATAR_TEXT_COLORS = ['#0D0D0D', '#7DB8E8', '#B8A3E8', '#86EFAC', '#FCA5A5', '#7DD3FC', '#FCD34D', '#C4B5FD'];

export default function AdminClients() {
  const router = useRouter();
  const [tab, setTab] = useState('tous');
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      let query = supabase
        .from('users')
        .select('id, full_name, email, phone_whatsapp, role, loyalty_level, total_packages, total_spent, is_blocked, is_verified, created_at', { count: 'exact' })
        .eq('role', 'client')
        .order('created_at', { ascending: false })
        .limit(50);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,phone_whatsapp.ilike.%${search.trim()}%`);
      }

      if (tab === 'actif') query = query.eq('is_blocked', false);
      else if (tab === 'bloque') query = query.eq('is_blocked', true);

      const { data, count } = await query;
      const all = data ?? [];

      if (tab === 'tous' && !search.trim()) {
        setTotal(count ?? 0);
        setActiveCount(all.filter((c: any) => !c.is_blocked).length);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setNewCount(all.filter((c: any) => new Date(c.created_at) > thirtyDaysAgo).length);
      }

      setClients(all);
    } catch {}
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  }

  function getClientStatus(c: any): string {
    if (c.is_blocked) return 'bloque';
    if ((c.total_packages ?? 0) === 0) return 'inactif';
    return 'actif';
  }

  function getInitials(name: string) {
    return (name || 'U').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
  }

  function getAvatarColor(i: number) {
    return { bg: AVATAR_COLORS[i % AVATAR_COLORS.length], text: AVATAR_TEXT_COLORS[i % AVATAR_TEXT_COLORS.length] };
  }

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
          <Text style={s.headerTitle}>Clients</Text>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerBtn} activeOpacity={0.7} onPress={() => setShowSearch((v) => !v)}>
              <Filter size={17} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} activeOpacity={0.7} onPress={() => setShowSearch((v) => !v)}>
              <Search size={17} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* RECHERCHE */}
        {showSearch && (
          <View style={s.searchWrap}>
            <Search size={17} color={ACCENT} strokeWidth={2} style={{ position: 'absolute', left: 15, top: 15, zIndex: 1 }} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Nom, email, téléphone..."
              placeholderTextColor="#5B6470"
              autoCapitalize="none"
            />
          </View>
        )}

        {/* STATS PILLS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 8, paddingTop: 14 }}>
          <View style={s.pill}>
            <Text style={s.pillTextWhite}>Total : {total.toLocaleString()}</Text>
          </View>
          <View style={s.pill}>
            <Text style={s.pillTextGrey}>Actifs </Text>
            <View style={[s.pillBadge, { backgroundColor: 'rgba(34,197,94,0.14)' }]}>
              <Text style={[s.pillBadgeText, { color: '#22C55E' }]}>{activeCount.toLocaleString()}</Text>
            </View>
          </View>
          <View style={s.pill}>
            <Text style={s.pillTextGrey}>Nouveaux </Text>
            <View style={[s.pillBadge, { backgroundColor: 'rgba(34,197,94,0.14)' }]}>
              <Text style={[s.pillBadgeText, { color: ACCENT }]}>{newCount}</Text>
            </View>
          </View>
        </ScrollView>

        {/* TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 8, paddingTop: 14 }}>
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
        ) : clients.length === 0 ? (
          <Text style={s.emptyText}>Aucun client trouvé.</Text>
        ) : (
          <View style={{ paddingHorizontal: 22, gap: 12, marginTop: 18 }}>
            {clients.map((c: any, i: number) => {
              const status = getClientStatus(c);
              const badge = STATUS_MAP[status];
              const avatarC = getAvatarColor(i);
              const loyalty = c.loyalty_level ?? 'bronze';
              const loyaltyLabel = loyalty.charAt(0).toUpperCase() + loyalty.slice(1);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={s.card}
                  activeOpacity={0.7}
                  onPress={() => {
                    Alert.alert(
                      c.full_name || 'Client',
                      [
                        `Email: ${c.email ?? '—'}`,
                        `Téléphone: ${c.phone_whatsapp ?? '—'}`,
                        `Rôle: ${c.role ?? '—'}`,
                        `Fidélité: ${loyaltyLabel}`,
                        `Colis total: ${c.total_packages ?? 0}`,
                        `Total dépensé: $${(c.total_spent ?? 0).toFixed(2)}`,
                        `Créé le: ${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}`,
                      ].join('\n'),
                    );
                  }}
                >
                  {/* Top section */}
                  <View style={s.cardTop}>
                    <View style={[s.avatar, { backgroundColor: avatarC.bg }]}>
                      <Text style={[s.avatarText, { color: avatarC.text }]}>{getInitials(c.full_name)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.cardName}>{c.full_name || '—'}</Text>
                      <Text style={s.cardEmail} numberOfLines={1}>{c.email}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>

                  {/* Bottom stats bar */}
                  <View style={s.cardStats}>
                    <Package size={12} color="#6B7280" strokeWidth={1.8} />
                    <Text style={s.cardStatText}>{c.total_packages ?? 0} colis</Text>
                    <Text style={s.cardStatSep}>|</Text>
                    <DollarSign size={12} color="#6B7280" strokeWidth={1.8} />
                    <Text style={s.cardStatText}>${(c.total_spent ?? 0).toFixed(2)}</Text>
                    <Text style={s.cardStatSep}>|</Text>
                    <Award size={12} color="#6B7280" strokeWidth={1.8} />
                    <Text style={s.cardStatText}>{loyaltyLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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

  searchWrap: { position: 'relative', marginHorizontal: 22 },
  searchInput: {
    width: '100%', height: 48, backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12,
    color: '#FFFFFF', paddingLeft: 44, paddingRight: 16, fontSize: 14,
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
    height: 36, borderRadius: 99, paddingHorizontal: 16,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { fontWeight: '700', color: '#0D0D0D' },

  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 14, overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    padding: 14, paddingHorizontal: 16,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cardEmail: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  cardStats: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#222222', paddingVertical: 9, paddingHorizontal: 16,
  },
  cardStatText: { fontSize: 11, color: '#9CA3AF' },
  cardStatSep: { fontSize: 11, color: '#3A3A3A' },
});
