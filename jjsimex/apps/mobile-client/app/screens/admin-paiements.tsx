import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl, Alert, TextInput, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, DollarSign, CheckCircle, XCircle, Clock,
  CreditCard, TrendingUp, Search, MessageCircle,
  Smartphone, Building, Banknote, Wallet,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { confirmPayment, refusePayment } from '@jjsimex/supabase/payments';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const TABS = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmés' },
  { key: 'failed', label: 'Échoués' },
] as const;

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'En attente', bg: 'rgba(34,197,94,0.14)', color: ACCENT },
  confirmed: { label: 'Confirmé', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  failed: { label: 'Échoué', bg: 'rgba(239,68,68,0.14)', color: '#EF4444' },
  refunded: { label: 'Remboursé', bg: 'rgba(168,85,247,0.14)', color: '#A855F7' },
};

const METHOD_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  moncash: { label: 'MonCash', icon: Smartphone, color: '#22C55E' },
  zelle: { label: 'Zelle', icon: Building, color: '#6D28D9' },
  wire: { label: 'Virement', icon: Building, color: '#3B82F6' },
  cash: { label: 'Espèces', icon: Banknote, color: '#22C55E' },
  visa_mc: { label: 'Carte', icon: CreditCard, color: '#EC4899' },
};

interface Payment {
  id: string;
  transaction_number: string;
  package_id: string | null;
  client_id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  client?: { full_name?: string; email?: string; phone_whatsapp?: string };
  package?: { tracking_number?: string; destination_city?: string; total_price?: number };
}

interface Stats {
  todayRevenue: number;
  monthRevenue: number;
  pendingAmount: number;
  refundedAmount: number;
}

export default function AdminPaiements() {
  const router = useRouter();
  const { profile } = useAuth();
  const [tab, setTab] = useState('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({ todayRevenue: 0, monthRevenue: 0, pendingAmount: 0, refundedAmount: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      let query = supabase
        .from('payments')
        .select('*, client:client_id(full_name, email, phone_whatsapp), package:package_id(tracking_number, destination_city, total_price)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tab !== 'all') query = query.eq('status', tab);
      if (search.trim()) {
        query = query.or(`transaction_number.ilike.%${search.trim()}%`);
      }

      const { data } = await query;
      const all = (data ?? []) as Payment[];
      setPayments(all);

      // Stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data: allPayments } = await supabase.from('payments').select('amount, status, created_at');
      const ap = allPayments ?? [];

      setStats({
        todayRevenue: ap.filter(p => p.status === 'confirmed' && new Date(p.created_at) >= today).reduce((s, p) => s + Number(p.amount), 0),
        monthRevenue: ap.filter(p => p.status === 'confirmed' && new Date(p.created_at) >= monthStart).reduce((s, p) => s + Number(p.amount), 0),
        pendingAmount: ap.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0),
        refundedAmount: ap.filter(p => p.status === 'refunded').reduce((s, p) => s + Number(p.amount), 0),
      });
    } catch {}
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('payments_admin_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function handleConfirm(p: Payment) {
    Alert.alert('Confirmer le paiement', `Confirmer $${Number(p.amount).toFixed(2)} de ${p.client?.full_name ?? 'client'} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Confirmer', onPress: async () => {
          try {
            await confirmPayment(p.id, profile!.id, supabase);
            fetchData();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function handleRefuse(p: Payment) {
    Alert.alert('Refuser le paiement', `Refuser le paiement ${p.transaction_number} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Refuser', style: 'destructive', onPress: async () => {
          try {
            await refusePayment(p.id, 'Paiement non vérifié', profile!.id, supabase);
            fetchData();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function handleWhatsAppReceipt(p: Payment) {
    const phone = p.client?.phone_whatsapp?.replace(/\D/g, '') ?? '';
    if (!phone) { Alert.alert('Erreur', 'Pas de numéro WhatsApp.'); return; }
    const msg = encodeURIComponent(
      `Bonjour ${p.client?.full_name ?? ''},\n\n✅ Votre paiement de $${Number(p.amount).toFixed(2)} (${p.transaction_number}) a été confirmé.\n\nMerci !\nJJ's IMEX`
    );
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  }

  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Paiements</Text>
        {pendingCount > 0 && (
          <View style={s.headerBadge}><Text style={s.headerBadgeText}>{pendingCount}</Text></View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* KPI CARDS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 10, paddingTop: 14 }}>
          <View style={s.kpiCard}>
            <TrendingUp size={16} color="#22C55E" strokeWidth={2} />
            <Text style={s.kpiLabel}>Aujourd'hui</Text>
            <Text style={s.kpiValue}>${stats.todayRevenue.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.kpiCard}>
            <DollarSign size={16} color="#3B82F6" strokeWidth={2} />
            <Text style={s.kpiLabel}>Ce mois</Text>
            <Text style={s.kpiValue}>${stats.monthRevenue.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.kpiCard}>
            <Clock size={16} color={ACCENT} strokeWidth={2} />
            <Text style={s.kpiLabel}>En attente</Text>
            <Text style={s.kpiValue}>${stats.pendingAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.kpiCard}>
            <Wallet size={16} color="#A855F7" strokeWidth={2} />
            <Text style={s.kpiLabel}>Remboursements</Text>
            <Text style={s.kpiValue}>${stats.refundedAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
          </View>
        </ScrollView>

        {/* SEARCH */}
        <View style={s.searchWrap}>
          <Search size={16} color={ACCENT} strokeWidth={2} style={{ position: 'absolute', left: 14, top: 14, zIndex: 1 }} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Nom client, N° transaction..."
            placeholderTextColor="#5B6470"
          />
        </View>

        {/* TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingVertical: 10 }}>
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

        {/* LIST */}
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : payments.length === 0 ? (
          <Text style={s.emptyText}>Aucun paiement trouvé.</Text>
        ) : (
          <View style={{ paddingHorizontal: 18, gap: 14 }}>
            {payments.map((p) => {
              const badge = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
              const methodCfg = METHOD_CONFIG[p.method] ?? METHOD_CONFIG.cash;
              const MethodIcon = methodCfg.icon;

              return (
                <View key={p.id} style={s.card}>
                  {/* Top: txn + amount */}
                  <View style={s.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTxn}>{p.transaction_number}</Text>
                      <Text style={s.cardClient}>{p.client?.full_name ?? '—'}</Text>
                    </View>
                    <Text style={s.cardAmount}>${Number(p.amount).toFixed(2)}</Text>
                  </View>

                  {/* Details */}
                  <View style={s.cardDetails}>
                    <View style={s.detailRow}>
                      <MethodIcon size={13} color={methodCfg.color} strokeWidth={1.8} />
                      <Text style={s.detailText}>{methodCfg.label}</Text>
                      <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>

                    {p.reference && (
                      <View style={s.detailRow}>
                        <Text style={s.refLabel}>Réf:</Text>
                        <Text style={s.refValue}>{p.reference}</Text>
                      </View>
                    )}

                    {p.package?.tracking_number && (
                      <View style={s.detailRow}>
                        <Text style={s.refLabel}>Colis:</Text>
                        <Text style={s.refValue}>{p.package.tracking_number}</Text>
                      </View>
                    )}

                    <Text style={s.dateText}>
                      {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {/* Actions */}
                  {p.status === 'pending' && (
                    <View style={s.actionsBlock}>
                      <TouchableOpacity style={s.confirmBtn} onPress={() => handleConfirm(p)} activeOpacity={0.7}>
                        <CheckCircle size={14} color="#FFFFFF" strokeWidth={2} />
                        <Text style={s.confirmBtnText}>Confirmer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.refuseBtn} onPress={() => handleRefuse(p)} activeOpacity={0.7}>
                        <XCircle size={14} color="#EF4444" strokeWidth={2} />
                        <Text style={s.refuseBtnText}>Refuser</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {p.status === 'confirmed' && p.client?.phone_whatsapp && (
                    <View style={s.actionsBlock}>
                      <TouchableOpacity style={s.whatsappBtn} onPress={() => handleWhatsAppReceipt(p)} activeOpacity={0.7}>
                        <MessageCircle size={14} color="#25D366" strokeWidth={2} />
                        <Text style={s.whatsappText}>Envoyer reçu WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: statusBarH + 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  headerBadge: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: '#0D0D0D' },

  kpiCard: {
    width: 140, backgroundColor: '#1A1A1A', borderRadius: 14,
    borderWidth: 1, borderColor: '#1F1F1F', padding: 14, gap: 6,
  },
  kpiLabel: { fontSize: 11, color: '#6B7280' },
  kpiValue: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },

  searchWrap: { position: 'relative', marginHorizontal: 18, marginTop: 12 },
  searchInput: {
    height: 44, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    borderRadius: 12, color: '#FFFFFF', paddingLeft: 40, paddingRight: 14, fontSize: 13,
  },

  tabBtn: {
    height: 34, borderRadius: 99, paddingHorizontal: 14,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { fontWeight: '700', color: '#0D0D0D' },

  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 16, paddingBottom: 8,
  },
  cardTxn: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  cardClient: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardAmount: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  cardDetails: { paddingHorizontal: 16, paddingBottom: 10, gap: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, marginLeft: 'auto' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  refLabel: { fontSize: 11, color: '#4B5563' },
  refValue: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  dateText: { fontSize: 10, color: '#4B5563', marginTop: 2 },

  actionsBlock: {
    flexDirection: 'row', gap: 8, padding: 14, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#222222',
  },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#22C55E', borderRadius: 10, paddingVertical: 10,
  },
  confirmBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  refuseBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  refuseBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  whatsappBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(37,211,102,0.1)', borderRadius: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(37,211,102,0.3)',
  },
  whatsappText: { fontSize: 12, fontWeight: '700', color: '#25D366' },
});
