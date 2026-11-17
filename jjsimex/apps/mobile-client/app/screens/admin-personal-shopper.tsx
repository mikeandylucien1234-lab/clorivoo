import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl, Alert, Linking, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, ShoppingCart, ExternalLink, MapPin, Truck,
  DollarSign, Clock, CheckCircle, XCircle, Package,
  MessageCircle, AlertTriangle, Hash, User, Palette, FileText,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { sendPushNotification } from '@jjsimex/supabase/push';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';
const WHATSAPP_PREFIX = '1809';

interface ShopperRequest {
  id: string;
  request_number: string;
  client_id: string;
  product_url: string;
  merchant: string;
  quantity: number;
  variant: string | null;
  destination_city: string;
  destination_country: string;
  transport_mode: string;
  estimated_price: number | null;
  final_price: number | null;
  shipping_cost: number | null;
  total_price: number | null;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  handled_by: string | null;
  created_at: string;
  updated_at: string;
  client?: { full_name?: string; email?: string; phone_whatsapp?: string };
}

const TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'active', label: 'En cours' },
  { key: 'done', label: 'Complétées' },
  { key: 'cancelled', label: 'Annulées' },
] as const;

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'En attente', bg: 'rgba(34,197,94,0.14)', color: ACCENT },
  quoted: { label: 'Devis envoyé', bg: 'rgba(59,130,246,0.14)', color: '#3B82F6' },
  confirmed: { label: 'Confirmée', bg: 'rgba(168,85,247,0.14)', color: '#A855F7' },
  purchased: { label: 'Achetée', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  shipped: { label: 'Expédiée', bg: 'rgba(6,182,212,0.14)', color: '#06B6D4' },
  cancelled: { label: 'Annulée', bg: 'rgba(239,68,68,0.14)', color: '#EF4444' },
};

function getTabStatuses(tab: string): string[] {
  if (tab === 'pending') return ['pending'];
  if (tab === 'active') return ['quoted', 'confirmed', 'purchased'];
  if (tab === 'done') return ['shipped'];
  if (tab === 'cancelled') return ['cancelled'];
  return [];
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

export default function AdminPersonalShopper() {
  const router = useRouter();
  const { profile } = useAuth();
  const [tab, setTab] = useState('pending');
  const [requests, setRequests] = useState<ShopperRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [sendingQuote, setSendingQuote] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const statuses = getTabStatuses(tab);
      const { data } = await supabase
        .from('personal_shopper')
        .select('*, client:client_id(full_name, email, phone_whatsapp)')
        .in('status', statuses)
        .order('created_at', { ascending: tab === 'pending' });

      setRequests((data ?? []) as ShopperRequest[]);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    const channel = supabase
      .channel('shopper_admin_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_shopper' }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }

  const pendingCount = tab === 'pending' ? requests.length : 0;

  const urgentRequests = requests.filter(r => {
    if (r.status !== 'pending') return false;
    const age = Date.now() - new Date(r.created_at).getTime();
    return age > 2 * 60 * 60 * 1000;
  });

  async function handleSendQuote(r: ShopperRequest) {
    const priceStr = priceInputs[r.id];
    if (!priceStr || isNaN(Number(priceStr)) || Number(priceStr) <= 0) {
      Alert.alert('Erreur', 'Entrez un prix valide.');
      return;
    }
    setSendingQuote(r.id);
    try {
      const finalPrice = Number(priceStr);
      const { data: rates } = await supabase
        .from('shipping_rates')
        .select('air_rate_per_lb, sea_rate_per_lb')
        .eq('destination_city', r.destination_city)
        .eq('destination_country', r.destination_country)
        .eq('is_active', true)
        .limit(1)
        .single();

      const rate = r.transport_mode === 'air'
        ? (rates?.air_rate_per_lb ?? 7)
        : (rates?.sea_rate_per_lb ?? 3);
      const shippingCost = rate * 1;
      const totalPrice = finalPrice + shippingCost;

      await supabase.from('personal_shopper').update({
        final_price: finalPrice,
        shipping_cost: shippingCost,
        total_price: totalPrice,
        status: 'quoted',
        handled_by: profile!.id,
      }).eq('id', r.id);

      const quoteTitle = 'Votre devis est prêt !';
      const quoteMsg = `${r.request_number}: Produit $${finalPrice.toFixed(2)} + Livraison $${shippingCost.toFixed(2)} = Total $${totalPrice.toFixed(2)}`;
      await supabase.from('notifications').insert({
        user_id: r.client_id,
        type: 'personal_shopper',
        title: quoteTitle,
        message: quoteMsg,
        action_url: `/shopper/${r.id}`,
      });
      sendPushNotification(r.client_id, quoteTitle, quoteMsg, undefined, supabase).catch(() => {});

      setPriceInputs(p => { const copy = { ...p }; delete copy[r.id]; return copy; });
      fetchRequests();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSendingQuote(null);
  }

  function handleWhatsApp(r: ShopperRequest) {
    const phone = r.client?.phone_whatsapp?.replace(/\D/g, '') ?? '';
    if (!phone) { Alert.alert('Erreur', 'Pas de numéro WhatsApp pour ce client.'); return; }
    const msg = encodeURIComponent(
      `Bonjour ${r.client?.full_name ?? ''},\n\nConcernant votre demande Personal Shopper ${r.request_number} (${r.merchant}).\n\nJJ's IMEX`
    );
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  }

  function handleCancel(r: ShopperRequest) {
    Alert.alert('Refuser la demande', `Refuser ${r.request_number} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Refuser', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('personal_shopper').update({
              status: 'cancelled', admin_notes: 'Refusé par admin', handled_by: profile!.id,
            }).eq('id', r.id);

            await supabase.from('notifications').insert({
              user_id: r.client_id,
              type: 'personal_shopper',
              title: 'Demande refusée',
              message: `${r.request_number}: Votre demande a été refusée. Contactez-nous pour plus d'infos.`,
            });

            fetchRequests();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function handleMarkPurchased(r: ShopperRequest) {
    Alert.alert('Marquer acheté', `Confirmer l'achat de ${r.request_number} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', onPress: async () => {
          try {
            await supabase.from('personal_shopper').update({ status: 'purchased', handled_by: profile!.id }).eq('id', r.id);
            await supabase.from('notifications').insert({
              user_id: r.client_id, type: 'personal_shopper',
              title: 'Commande achetée !', message: `${r.request_number} a été acheté. Expédition en cours.`,
            });
            fetchRequests();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function handleMarkShipped(r: ShopperRequest) {
    Alert.alert('Marquer expédié', `Confirmer l'expédition de ${r.request_number} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', onPress: async () => {
          try {
            await supabase.from('personal_shopper').update({ status: 'shipped', handled_by: profile!.id }).eq('id', r.id);
            await supabase.from('notifications').insert({
              user_id: r.client_id, type: 'personal_shopper',
              title: 'Commande expédiée !', message: `${r.request_number} est en route vers ${r.destination_city}.`,
            });
            fetchRequests();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  return (
    <View style={s.container}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Personal Shopper</Text>
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
        {/* TABS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingVertical: 14 }}>
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

        {/* URGENT BANNER */}
        {tab === 'pending' && urgentRequests.length > 0 && (
          <View style={s.urgentBanner}>
            <AlertTriangle size={16} color="#FCD34D" strokeWidth={2} />
            <Text style={s.urgentText}>
              {urgentRequests.length} demande{urgentRequests.length > 1 ? 's' : ''} en attente depuis +2h !
            </Text>
          </View>
        )}

        {/* LIST */}
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <Text style={s.emptyText}>Aucune demande dans cette catégorie.</Text>
        ) : (
          <View style={{ paddingHorizontal: 18, gap: 16 }}>
            {requests.map((r) => {
              const badge = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
              const isUrgent = r.status === 'pending' && (Date.now() - new Date(r.created_at).getTime()) > 2 * 60 * 60 * 1000;

              return (
                <View key={r.id} style={[s.card, isUrgent && { borderColor: '#F59E0B' }]}>
                  {/* Card header: client info + status */}
                  <View style={s.cardHeader}>
                    <View style={s.clientAvatar}>
                      <Text style={s.clientAvatarText}>
                        {(r.client?.full_name || 'C')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.clientName} numberOfLines={1}>{r.client?.full_name ?? '—'}</Text>
                        {isUrgent && <AlertTriangle size={12} color="#F59E0B" strokeWidth={2} />}
                      </View>
                      <Text style={s.clientPhone}>{r.client?.phone_whatsapp ?? 'Pas de téléphone'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.statusText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                      <Text style={s.timeAgo}>{timeAgo(r.created_at)}</Text>
                    </View>
                  </View>

                  {/* Request number */}
                  <View style={s.requestNumRow}>
                    <Hash size={12} color={ACCENT} strokeWidth={2} />
                    <Text style={s.requestNum}>{r.request_number}</Text>
                  </View>

                  {/* All details */}
                  <View style={s.detailsBlock}>
                    <View style={s.detailRow}>
                      <ShoppingCart size={13} color="#6B7280" strokeWidth={1.8} />
                      <Text style={s.detailLabel}>Marchand</Text>
                      <Text style={s.detailValue}>{r.merchant}</Text>
                    </View>

                    <View style={s.detailRow}>
                      <Package size={13} color="#6B7280" strokeWidth={1.8} />
                      <Text style={s.detailLabel}>Quantité</Text>
                      <Text style={s.detailValue}>{r.quantity}</Text>
                    </View>

                    {r.variant && (
                      <View style={s.detailRow}>
                        <Palette size={13} color="#6B7280" strokeWidth={1.8} />
                        <Text style={s.detailLabel}>Variante</Text>
                        <Text style={s.detailValue}>{r.variant}</Text>
                      </View>
                    )}

                    <View style={s.detailRow}>
                      <MapPin size={13} color="#6B7280" strokeWidth={1.8} />
                      <Text style={s.detailLabel}>Destination</Text>
                      <Text style={s.detailValue}>
                        {r.destination_city}, {r.destination_country === 'haiti' ? 'Haïti' : 'Rép. Dom.'}
                      </Text>
                    </View>

                    <View style={s.detailRow}>
                      <Truck size={13} color="#6B7280" strokeWidth={1.8} />
                      <Text style={s.detailLabel}>Transport</Text>
                      <Text style={s.detailValue}>{r.transport_mode === 'air' ? 'Aérien ✈️' : 'Maritime 🚢'}</Text>
                    </View>

                    {r.notes && (
                      <View style={s.detailRow}>
                        <FileText size={13} color="#6B7280" strokeWidth={1.8} />
                        <Text style={s.detailLabel}>Notes</Text>
                        <Text style={[s.detailValue, { flex: 1 }]} numberOfLines={3}>{r.notes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Product link */}
                  {r.product_url && (
                    <TouchableOpacity style={s.linkBtn} onPress={() => Linking.openURL(r.product_url)} activeOpacity={0.7}>
                      <ExternalLink size={14} color={ACCENT} strokeWidth={2} />
                      <Text style={s.linkText} numberOfLines={1}>Voir le produit — {r.product_url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Pricing info if quoted */}
                  {r.final_price != null && (
                    <View style={s.pricingBlock}>
                      <View style={s.priceRow}>
                        <Text style={s.priceLabel}>Prix produit</Text>
                        <Text style={s.priceValue}>${r.final_price.toFixed(2)}</Text>
                      </View>
                      <View style={s.priceRow}>
                        <Text style={s.priceLabel}>Frais livraison</Text>
                        <Text style={s.priceValue}>${(r.shipping_cost ?? 0).toFixed(2)}</Text>
                      </View>
                      <View style={[s.priceRow, { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 6 }]}>
                        <Text style={[s.priceLabel, { color: '#FFFFFF', fontWeight: '700' }]}>Total</Text>
                        <Text style={[s.priceValue, { color: '#22C55E', fontWeight: '800', fontSize: 16 }]}>${(r.total_price ?? 0).toFixed(2)}</Text>
                      </View>
                    </View>
                  )}

                  {/* ACTIONS for pending */}
                  {r.status === 'pending' && (
                    <View style={s.actionsBlock}>
                      <View style={s.quoteRow}>
                        <DollarSign size={16} color={ACCENT} strokeWidth={2} />
                        <TextInput
                          style={s.priceInput}
                          value={priceInputs[r.id] ?? ''}
                          onChangeText={(v) => setPriceInputs(p => ({ ...p, [r.id]: v }))}
                          placeholder="Prix du produit ($)"
                          placeholderTextColor="#5B6470"
                          keyboardType="decimal-pad"
                        />
                        <TouchableOpacity
                          style={[s.quoteBtn, sendingQuote === r.id && { opacity: 0.5 }]}
                          onPress={() => handleSendQuote(r)}
                          disabled={sendingQuote === r.id}
                          activeOpacity={0.7}
                        >
                          {sendingQuote === r.id ? (
                            <ActivityIndicator size="small" color="#0D0D0D" />
                          ) : (
                            <Text style={s.quoteBtnText}>Envoyer devis</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={s.whatsappBtn} onPress={() => handleWhatsApp(r)} activeOpacity={0.7}>
                          <MessageCircle size={14} color="#25D366" strokeWidth={2} />
                          <Text style={s.whatsappText}>WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(r)} activeOpacity={0.7}>
                          <XCircle size={14} color="#EF4444" strokeWidth={2} />
                          <Text style={s.cancelText}>Refuser</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* ACTIONS for quoted/confirmed */}
                  {r.status === 'quoted' && (
                    <View style={s.actionsBlock}>
                      <Text style={s.waitingText}>⏳ En attente de confirmation du client</Text>
                      <TouchableOpacity style={s.whatsappBtn} onPress={() => handleWhatsApp(r)} activeOpacity={0.7}>
                        <MessageCircle size={14} color="#25D366" strokeWidth={2} />
                        <Text style={s.whatsappText}>Relancer sur WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {r.status === 'confirmed' && (
                    <View style={s.actionsBlock}>
                      <TouchableOpacity style={s.actionBtnFull} onPress={() => handleMarkPurchased(r)} activeOpacity={0.7}>
                        <CheckCircle size={14} color="#FFFFFF" strokeWidth={2} />
                        <Text style={s.actionBtnFullText}>Marquer comme acheté</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {r.status === 'purchased' && (
                    <View style={s.actionsBlock}>
                      <TouchableOpacity style={[s.actionBtnFull, { backgroundColor: '#06B6D4' }]} onPress={() => handleMarkShipped(r)} activeOpacity={0.7}>
                        <Package size={14} color="#FFFFFF" strokeWidth={2} />
                        <Text style={s.actionBtnFullText}>Marquer comme expédié</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Date */}
                  <Text style={s.cardDate}>
                    Créée le {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
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

  tabBtn: {
    height: 34, borderRadius: 99, paddingHorizontal: 14,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { fontWeight: '700', color: '#0D0D0D' },

  urgentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 18, marginBottom: 10, padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  urgentText: { fontSize: 12, fontWeight: '700', color: '#FCD34D' },

  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#1F1F1F',
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10,
  },
  clientAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarText: { fontSize: 16, fontWeight: '800', color: '#0D0D0D' },
  clientName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  clientPhone: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  timeAgo: { fontSize: 10, color: '#4B5563' },

  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 10, fontWeight: '700' },

  requestNumRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 8, alignSelf: 'flex-start',
  },
  requestNum: { fontSize: 12, fontWeight: '700', color: ACCENT },

  detailsBlock: { paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailLabel: { fontSize: 11, color: '#6B7280', width: 75 },
  detailValue: { fontSize: 12, color: '#E5E7EB', fontWeight: '500' },

  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  linkText: { fontSize: 12, fontWeight: '600', color: ACCENT, flex: 1 },

  pricingBlock: {
    marginHorizontal: 16, marginBottom: 10, padding: 12,
    backgroundColor: '#222222', borderRadius: 10, gap: 4,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 12, color: '#9CA3AF' },
  priceValue: { fontSize: 13, color: '#E5E7EB', fontWeight: '600' },

  actionsBlock: {
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: '#222222', paddingTop: 12, marginTop: 2,
  },

  quoteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  priceInput: {
    flex: 1, height: 40, backgroundColor: '#0D0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 12, fontSize: 13,
  },
  quoteBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  quoteBtnText: { fontSize: 12, fontWeight: '700', color: '#0D0D0D' },

  whatsappBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(37,211,102,0.1)', borderWidth: 1, borderColor: 'rgba(37,211,102,0.3)',
  },
  whatsappText: { fontSize: 12, fontWeight: '700', color: '#25D366' },

  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  cancelText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  waitingText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },

  actionBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10, backgroundColor: ACCENT,
  },
  actionBtnFullText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  cardDate: { fontSize: 10, color: '#4B5563', paddingHorizontal: 16, paddingBottom: 12 },
});
