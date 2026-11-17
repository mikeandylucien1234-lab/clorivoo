import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { getClient } from '@jjsimex/supabase/client';
import { markPackageAsReceived } from '@jjsimex/supabase/packages';
import { supabase } from '@/lib/supabase';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  telephone: { label: 'Telephone', icon: '📱' },
  ordinateur: { label: 'Ordinateur', icon: '💻' },
  vetements: { label: 'Vetements', icon: '👕' },
  chaussures: { label: 'Chaussures', icon: '👟' },
  electronique: { label: 'Electronique', icon: '🔌' },
  maison: { label: 'Maison', icon: '🏠' },
  cosmetiques: { label: 'Cosmetiques', icon: '💄' },
  autre: { label: 'Autre', icon: '📦' },
};

type Tab = 'awaiting' | 'tracking_added' | 'all';

interface Shipment {
  id: string;
  request_number: string;
  tracking_number: string | null;
  category: string | null;
  description: string | null;
  real_weight_lbs: number;
  billed_weight_lbs: number;
  declared_value: number;
  quantity: number;
  destination_city: string;
  destination_country: string;
  transport_mode: string;
  total_price: number;
  shipping_rate: number;
  insurance_amount: number;
  status: string;
  carrier_name: string | null;
  carrier_tracking_number: string | null;
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  created_at: string;
  users: { full_name: string; phone_whatsapp: string | null; email: string } | null;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'awaiting', label: 'En attente' },
  { key: 'tracking_added', label: 'Tracking ajoute' },
  { key: 'all', label: 'Toutes' },
];

export default function AdminEnvoyer() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('awaiting');
  const [receiveModal, setReceiveModal] = useState<Shipment | null>(null);
  const [realWeight, setRealWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadShipments = useCallback(async () => {
    try {
      const supabase = getClient();
      const { data } = await supabase
        .from('packages')
        .select('id, request_number, tracking_number, category, description, real_weight_lbs, billed_weight_lbs, declared_value, quantity, destination_city, destination_country, transport_mode, total_price, shipping_rate, insurance_amount, status, carrier_name, carrier_tracking_number, recipient_first_name, recipient_last_name, recipient_phone, recipient_address, created_at, users!packages_client_id_fkey(full_name, phone_whatsapp, email)')
        .not('request_number', 'is', null)
        .order('created_at', { ascending: false });
      setShipments((data ?? []) as Shipment[]);
    } catch (e) {
      console.error('Failed to load shipments:', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadShipments();
    const supabase = getClient();
    const ch = supabase
      .channel('envoyer-mobile-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => loadShipments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadShipments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadShipments();
  }, [loadShipments]);

  const filtered = shipments.filter(s => {
    if (tab === 'awaiting') return s.status === 'awaiting_arrival' && !s.carrier_tracking_number;
    if (tab === 'tracking_added') return s.status === 'awaiting_arrival' && !!s.carrier_tracking_number;
    return true;
  });

  const countNoTracking = shipments.filter(s => s.status === 'awaiting_arrival' && !s.carrier_tracking_number).length;
  const countWithTracking = shipments.filter(s => s.status === 'awaiting_arrival' && !!s.carrier_tracking_number).length;

  const tabCounts: Record<Tab, number> = {
    awaiting: countNoTracking,
    tracking_added: countWithTracking,
    all: shipments.length,
  };

  const openReceiveModal = (s: Shipment) => {
    setReceiveModal(s);
    setRealWeight(String(s.real_weight_lbs || s.billed_weight_lbs || ''));
  };

  const handleReceive = async () => {
    if (!receiveModal) return;
    const weight = parseFloat(realWeight);
    if (!weight || weight <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un poids valide.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await markPackageAsReceived(receiveModal.id, weight, {}, supabase);
      if (result) {
        Alert.alert('Succes', `Colis marque comme recu. Tracking: ${result.tracking_number}`);
        setReceiveModal(null);
        loadShipments();
      } else {
        Alert.alert('Erreur', 'Echec de la reception du colis.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Une erreur est survenue.');
    }
    setSubmitting(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Demandes d'envoi</Text>
        <View style={s.statsRow}>
          <View style={s.statPill}>
            <Text style={[s.statValue, { color: '#EF4444' }]}>{countNoTracking}</Text>
            <Text style={s.statLabel}>Sans tracking</Text>
          </View>
          <View style={s.statPill}>
            <Text style={[s.statValue, { color: '#22C55E' }]}>{countWithTracking}</Text>
            <Text style={s.statLabel}>Tracking ajoute</Text>
          </View>
          <View style={s.statPill}>
            <Text style={[s.statValue, { color: ACCENT }]}>{shipments.filter(x => x.status === 'awaiting_arrival').length}</Text>
            <Text style={s.statLabel}>Total attente</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
            <View style={[s.tabBadge, tab === t.key && s.tabBadgeActive]}>
              <Text style={[s.tabBadgeText, tab === t.key && s.tabBadgeTextActive]}>
                {tabCounts[t.key]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <ScrollView
          style={s.list}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
        >
          {filtered.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyText}>Aucune demande dans cette categorie</Text>
            </View>
          ) : (
            filtered.map(shipment => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                formatDate={formatDate}
                onReceive={() => openReceiveModal(shipment)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Receive Modal */}
      <Modal visible={!!receiveModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Marquer comme recu</Text>
            {receiveModal && (
              <Text style={s.modalSubtitle}>
                {receiveModal.request_number} — {receiveModal.users?.full_name ?? '—'}
              </Text>
            )}

            <Text style={s.inputLabel}>Poids reel verifie (lbs)</Text>
            <TextInput
              style={s.input}
              value={realWeight}
              onChangeText={setRealWeight}
              keyboardType="decimal-pad"
              placeholderTextColor="#6B7280"
              placeholder="Ex: 5.2"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setReceiveModal(null)}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={s.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, submitting && { opacity: 0.6 }]}
                onPress={handleReceive}
                disabled={submitting || !realWeight}
                activeOpacity={0.7}
              >
                <Text style={s.confirmBtnText}>
                  {submitting ? 'Traitement...' : 'Confirmer la reception'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ShipmentCard({
  shipment: sh,
  formatDate,
  onReceive,
}: {
  shipment: Shipment;
  formatDate: (d: string) => string;
  onReceive: () => void;
}) {
  const cat = CATEGORIES[sh.category ?? ''] ?? { label: sh.category ?? '—', icon: '📦' };
  const hasTracking = !!sh.carrier_tracking_number;
  const initials = (sh.users?.full_name ?? '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={s.clientName}>{sh.users?.full_name ?? '—'}</Text>
            <Text style={s.clientContact}>{sh.users?.phone_whatsapp ?? sh.users?.email ?? '—'}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' as const }}>
          <Text style={s.requestNum}>{sh.request_number}</Text>
          <Text style={s.dateText}>{formatDate(sh.created_at)}</Text>
        </View>
      </View>

      {/* Info grid */}
      <View style={s.infoGrid}>
        <InfoCell label="Categorie" value={`${cat.icon} ${cat.label}`} />
        <InfoCell label="Poids est." value={`${sh.billed_weight_lbs} lbs`} />
        <InfoCell label="Valeur" value={`$${sh.declared_value}`} />
        <InfoCell label="Quantite" value={String(sh.quantity ?? 1)} />
        <InfoCell label="Transport" value={sh.transport_mode === 'air' ? 'Avion' : 'Bateau'} />
        <InfoCell label="Prix est." value={`$${Number(sh.total_price).toFixed(2)}`} accent />
      </View>

      {/* Description */}
      {sh.description ? (
        <View style={s.descBox}>
          <Text style={s.descText}>{sh.description}</Text>
        </View>
      ) : null}

      {/* Recipient */}
      {sh.recipient_first_name ? (
        <View style={s.recipientBox}>
          <Text style={s.sectionLabel}>DESTINATAIRE</Text>
          <Text style={s.recipientName}>{sh.recipient_first_name} {sh.recipient_last_name}</Text>
          <Text style={s.recipientDetail}>
            {sh.recipient_phone ? `${sh.recipient_phone} - ` : ''}
            {sh.destination_city}, {sh.destination_country === 'haiti' ? 'Haiti' : 'Rep. Dom.'}
          </Text>
          {sh.recipient_address ? (
            <Text style={s.recipientDetail}>{sh.recipient_address}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Tracking status */}
      <View style={s.trackingBox}>
        <Text style={s.sectionLabel}>TRACKING TRANSPORTEUR US</Text>
        {hasTracking ? (
          <Text style={s.trackingValue}>
            {sh.carrier_name ? `${sh.carrier_name} - ` : ''}{sh.carrier_tracking_number}
          </Text>
        ) : (
          <Text style={s.trackingPending}>En attente du tracking client</Text>
        )}
      </View>

      {/* Action button */}
      {sh.status === 'awaiting_arrival' && (
        <TouchableOpacity style={s.receiveBtn} onPress={onReceive} activeOpacity={0.7}>
          <Text style={s.receiveBtnText}>Marquer comme recu</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={s.infoCell}>
      <Text style={s.infoCellLabel}>{label}</Text>
      <Text style={[s.infoCellValue, accent && { color: ACCENT, fontWeight: '700' as const }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', paddingTop: statusBarH },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#222',
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#9CA3AF' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#111',
    borderRadius: 10, padding: 4, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 12,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: 6,
  },
  tabBtnActive: { backgroundColor: '#2A2A2A' },
  tabLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  tabLabelActive: { color: '#FFFFFF' },
  tabBadge: {
    backgroundColor: '#2A2A2A', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: ACCENT },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  tabBadgeTextActive: { color: '#0D0D0D' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#6B7280', fontSize: 14 },
  list: { flex: 1 },

  // Card
  card: {
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#222',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#0D0D0D', fontWeight: '700', fontSize: 14 },
  clientName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  clientContact: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  requestNum: { fontSize: 13, fontWeight: '700', color: ACCENT },
  dateText: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  // Info grid
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10,
  },
  infoCell: {
    backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    width: '31%' as any,
  },
  infoCellLabel: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoCellValue: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },

  // Description
  descBox: { backgroundColor: '#111', borderRadius: 8, padding: 10, marginBottom: 10 },
  descText: { fontSize: 12, color: '#E5E7EB' },

  // Recipient
  recipientBox: { backgroundColor: '#111', borderRadius: 8, padding: 10, marginBottom: 10 },
  sectionLabel: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  recipientName: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
  recipientDetail: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  // Tracking
  trackingBox: { backgroundColor: '#111', borderRadius: 8, padding: 10, marginBottom: 12 },
  trackingValue: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  trackingPending: { fontSize: 12, color: ACCENT, fontWeight: '600' },

  // Receive button
  receiveBtn: {
    backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  receiveBtnText: { color: '#0D0D0D', fontSize: 14, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#2A2A2A',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },
  inputLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  input: {
    backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8,
    color: '#FFFFFF', padding: 12, fontSize: 14, marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, backgroundColor: '#2A2A2A', borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 2, paddingVertical: 12, backgroundColor: ACCENT, borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#0D0D0D', fontSize: 14, fontWeight: '700' },
});
