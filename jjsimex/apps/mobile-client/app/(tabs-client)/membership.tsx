import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Gift, Star, ChevronRight, Truck, ShoppingCart, Calculator, Award } from 'lucide-react-native';

const TIERS = [
  { key: 'bronze', label: 'Bronze', min: 0, max: 500, icon: '🥉' },
  { key: 'silver', label: 'Silver', min: 500, max: 1500, icon: '🥈' },
  { key: 'gold', label: 'Gold', min: 1500, max: 5000, icon: '🥇' },
  { key: 'platinum', label: 'Platinum', min: 5000, max: 999999, icon: '💎' },
];

interface PointHistory {
  id: string;
  points: number;
  action: string;
  description: string;
  created_at: string;
}

interface Voucher {
  id: string;
  is_used: boolean;
  voucher: {
    code: string;
    description: string;
    discount_type: string;
    discount_value: number;
    expires_at: string;
  };
}

export default function MembershipScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const ACCENT = colors.accent;

  const [refreshing, setRefreshing] = useState(false);
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [tab, setTab] = useState<'points' | 'vouchers'>('points');

  const loyalty = profile?.loyalty_level ?? 'bronze';
  const tier = TIERS.find(t => t.key === loyalty) ?? TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const progress = nextTier ? Math.min((points - tier.min) / (nextTier.min - tier.min), 1) : 1;

  const loadData = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const { data: user } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', session.user.id)
        .single();
      setPoints((user as any)?.points_balance ?? 0);
    } catch {}
    try {
      const { data } = await supabase
        .from('membership_points')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory((data ?? []) as PointHistory[]);
    } catch {}
    try {
      const { data } = await supabase
        .from('user_vouchers')
        .select('id, is_used, vouchers(code, description, discount_type, discount_value, expires_at)')
        .eq('user_id', session.user.id)
        .order('claimed_at', { ascending: false });
      setVouchers((data ?? []).map((v: any) => ({ ...v, voucher: v.vouchers })) as Voucher[]);
    } catch {}
  }, [session?.user.id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 110 : 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Membership</Text>
        </View>

        {/* Tier Card */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={[styles.tierCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tierTop}>
              <Text style={{ fontSize: 36 }}>{tier.icon}</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.tierName, { color: colors.text }]}>{tier.label} Member</Text>
                <Text style={[styles.tierPoints, { color: ACCENT }]}>{points} Points</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: colors.accentLight }]}>
                <Star size={14} color={ACCENT} strokeWidth={2} />
              </View>
            </View>

            {nextTier && (
              <View style={styles.progressSection}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: ACCENT }]} />
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
                  {nextTier.min - points} points pour {nextTier.label}
                </Text>
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              {[
                { Icon: Truck, label: 'Envoyer', route: '/screens/create-shipment' },
                { Icon: ShoppingCart, label: 'Shopper', route: '/screens/personal-shopper' },
                { Icon: Calculator, label: 'Calculer', route: '/screens/calculateur' },
                { Icon: Gift, label: 'Échanger', route: null },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => item.route && router.push(item.route as any)}
                  style={[styles.quickAction, { backgroundColor: colors.accentLight }]}
                  activeOpacity={0.8}
                >
                  <item.Icon size={20} color={ACCENT} strokeWidth={1.8} />
                  <Text style={{ fontSize: 10, color: ACCENT, fontWeight: '600', marginTop: 4 }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* How to Earn */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Comment gagner des points</Text>
          {[
            { icon: '📦', text: 'Créer un envoi', pts: '+100' },
            { icon: '🛍️', text: 'Personal Shopper', pts: '+150' },
            { icon: '👥', text: 'Parrainer un ami', pts: '+200' },
            { icon: '⭐', text: 'Laisser un avis', pts: '+50' },
          ].map((item, i) => (
            <View key={i} style={[styles.earnRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={[{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 12 }]}>{item.text}</Text>
              <View style={[styles.ptsChip, { backgroundColor: colors.accentLight }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT }}>{item.pts}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'points' && { backgroundColor: ACCENT }]}
              onPress={() => setTab('points')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'points' && { color: '#FFFFFF' }]}>Historique</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'vouchers' && { backgroundColor: ACCENT }]}
              onPress={() => setTab('vouchers')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'vouchers' && { color: '#FFFFFF' }]}>Mes Vouchers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Points History */}
        {tab === 'points' && (
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Award size={40} color={colors.textMuted} strokeWidth={1.2} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 10 }}>Aucun historique de points</Text>
              </View>
            ) : (
              history.map(h => (
                <View key={h.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{h.description}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{fmtDate(h.created_at)}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: h.points > 0 ? ACCENT : colors.error }}>
                    {h.points > 0 ? '+' : ''}{h.points}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Vouchers */}
        {tab === 'vouchers' && (
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            {vouchers.length === 0 ? (
              <View style={styles.emptyState}>
                <Gift size={40} color={colors.textMuted} strokeWidth={1.2} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 10 }}>Aucun voucher disponible</Text>
              </View>
            ) : (
              vouchers.map(v => (
                <View key={v.id} style={[styles.voucherCard, { backgroundColor: colors.card, borderColor: v.is_used ? colors.border : ACCENT }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: v.is_used ? colors.textMuted : colors.text }}>{v.voucher.description}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Code: {v.voucher.code}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Expire le {fmtDate(v.voucher.expires_at)}</Text>
                  </View>
                  <View style={[styles.discountBadge, { backgroundColor: v.is_used ? colors.border : colors.accentLight }]}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: v.is_used ? colors.textMuted : ACCENT }}>
                      {v.voucher.discount_type === 'percentage' ? `${v.voucher.discount_value}%` : `$${v.voucher.discount_value}`}
                    </Text>
                    {v.is_used && <Text style={{ fontSize: 10, color: colors.textMuted }}>Utilisé</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  tierCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  tierTop: { flexDirection: 'row', alignItems: 'center' },
  tierName: { fontSize: 18, fontWeight: '800' },
  tierPoints: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  tierBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  progressSection: { marginTop: 16 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  quickAction: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  earnRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  ptsChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tabRow: { flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  voucherCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  discountBadge: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
});
