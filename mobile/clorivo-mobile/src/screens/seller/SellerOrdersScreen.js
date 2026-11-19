import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOW } from '../../lib/tokens';
import { EmptyState } from '../../components/UI';
import { getSellerShipments, updateSellerShipment, reportShipmentDeliveryFailure, createSellerShipment } from '../../lib/supabase';
import { useSession } from '../../hooks/useSession';

// Phase 5: a shipment, not a raw order_item, is the unit shown here. A
// seller only ever sees their OWN shipments — never another seller's
// shipment on the same multi-vendor order, and never a whole-order status.
const STATUS_COLOR = {
  pending: '#F59E0B', processing: COLORS.primary, shipped: '#3B82F6',
  in_transit: '#3B82F6', delivered: '#10B981', failed: '#EF4444',
  returned: '#EF4444', cancelled: COLORS.mute,
};
const STATUS_LABEL = {
  pending: 'En attente', processing: 'En préparation', shipped: 'Expédiée',
  in_transit: 'En transit', delivered: 'Livrée', failed: 'Échec de livraison',
  returned: 'Retournée', cancelled: 'Annulée',
};
const NEXT_STATUS = { pending: 'processing', processing: 'shipped', shipped: 'in_transit', in_transit: 'delivered' };
const NEXT_LABEL  = { pending: 'Confirmer', processing: 'Marquer expédiée', shipped: 'En transit', in_transit: 'Marquer livrée' };

export default function SellerOrdersScreen({ navigation }) {
  const session = useSession();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [trackingModal, setTrackingModal] = useState(null); // { shipment }
  const [carrierInput, setCarrierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [failureModal, setFailureModal] = useState(null); // shipment
  const [failureReason, setFailureReason] = useState('');

  const reload = useCallback(() => {
    if (!session?.user) return;
    getSellerShipments(session.user.id, 50).then(data => { setShipments(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // Advances exactly one shipment that belongs to THIS seller. The server
  // RPC independently re-checks ownership and the forward-only transition
  // rule, so this call can never move another seller's shipment even if
  // this screen had a bug.
  function advance(shipment) {
    const next = NEXT_STATUS[shipment.status];
    if (!next) return;
    if (next === 'shipped' && !shipment.tracking_number) {
      setCarrierInput(shipment.carrier ?? '');
      setTrackingInput(shipment.tracking_number ?? '');
      setTrackingModal(shipment);
      return;
    }
    Alert.alert(NEXT_LABEL[shipment.status], `Passer la commande #${shipment.order_id.slice(0,8).toUpperCase()} à "${STATUS_LABEL[next]}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => doAdvance(shipment, next) },
    ]);
  }

  async function doAdvance(shipment, next, extra = {}) {
    setBusyId(shipment.id);
    try {
      await updateSellerShipment(shipment.id, next, extra);
      reload();
    } catch (e) {
      Alert.alert('Erreur', e.message ?? "Impossible de mettre à jour cette expédition. Réessayez.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmTrackingModal() {
    if (!trackingInput.trim()) {
      Alert.alert('Numéro de suivi requis', 'Indiquez le numéro de suivi avant de marquer cette expédition comme expédiée.');
      return;
    }
    const shipment = trackingModal;
    setTrackingModal(null);
    doAdvance(shipment, 'shipped', { carrier: carrierInput.trim() || null, trackingNumber: trackingInput.trim() });
  }

  function reportFailure(shipment) {
    setFailureReason('');
    setFailureModal(shipment);
  }

  async function confirmFailureModal() {
    if (!failureReason.trim()) {
      Alert.alert('Raison requise', 'Décrivez brièvement ce qui s\'est passé avant de confirmer.');
      return;
    }
    const shipment = failureModal;
    setFailureModal(null);
    setBusyId(shipment.id);
    try {
      await reportShipmentDeliveryFailure(shipment.id, failureReason.trim());
      reload();
    } catch (e) {
      Alert.alert('Erreur', e.message ?? 'Échec de la mise à jour.');
    } finally {
      setBusyId(null);
    }
  }

  // Splits one item off the shipment into its own, brand-new shipment —
  // this is how a seller ships part of an order first. Never touches any
  // other seller's items, and the server RPC enforces that independently.
  function splitItem(shipment, item) {
    if (shipment.items.length < 2) return;
    Alert.alert(
      'Expédier séparément',
      `Créer une expédition séparée pour "${item.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: async () => {
          setBusyId(shipment.id);
          try {
            await createSellerShipment(shipment.order_id, [item.id]);
            reload();
          } catch (e) {
            Alert.alert('Erreur', e.message ?? "Impossible de créer l'expédition.");
          } finally {
            setBusyId(null);
          }
        }},
      ]
    );
  }

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.paper }} edges={['top']}>
      <View style={{ backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.hairline, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: COLORS.ink }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>Mes expéditions</Text>
      </View>

      {shipments.length === 0 ? (
        <EmptyState icon="📦" title="Aucune expédition" subtitle="Vos expéditions apparaîtront ici dès qu'une commande arrive" />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {shipments.map(shipment => {
            const color = STATUS_COLOR[shipment.status] ?? COLORS.mute;
            const canAdvance = !!NEXT_STATUS[shipment.status];
            const canReportFailure = shipment.status === 'shipped' || shipment.status === 'in_transit';
            const busy = busyId === shipment.id;
            return (
              <View key={shipment.id} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>#{shipment.order_id.slice(0, 8).toUpperCase()}</Text>
                  <View style={{ backgroundColor: color + '20', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color }}>{STATUS_LABEL[shipment.status] ?? shipment.status}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: COLORS.mute, marginBottom: 8 }}>
                  {new Date(shipment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  {shipment.tracking_number ? ` · ${shipment.carrier ?? 'Suivi'}: ${shipment.tracking_number}` : ''}
                </Text>

                {shipment.items.map((item, i) => (
                  <View key={item.id} style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: COLORS.hairline, paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>{item.title}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.mute }}>Qté {item.quantity} · ${Number(item.unit_price).toFixed(2)}</Text>
                    </View>
                    {shipment.items.length > 1 && (shipment.status === 'pending' || shipment.status === 'processing') && (
                      <TouchableOpacity disabled={busy} onPress={() => splitItem(shipment, item)}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.primary }}>Expédier séparément</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {shipment.failure_reason && (
                  <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>Échec : {shipment.failure_reason}</Text>
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {canAdvance && (
                    <TouchableOpacity disabled={busy} onPress={() => advance(shipment)}
                      style={{ flex: 1, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center', opacity: busy ? 0.5 : 1 }}>
                      {busy ? <ActivityIndicator color={COLORS.primary} size="small" /> : (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>{NEXT_LABEL[shipment.status]} →</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {canReportFailure && (
                    <TouchableOpacity disabled={busy} onPress={() => reportFailure(shipment)}
                      style={{ paddingHorizontal: 14, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Signaler un échec</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!trackingModal} transparent animationType="fade" onRequestClose={() => setTrackingModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 4 }}>Informations d'expédition</Text>
            <Text style={{ fontSize: 12, color: COLORS.mute, marginBottom: 16 }}>Ces informations sont fournies par vous et affichées comme telles à l'acheteur.</Text>
            <TextInput placeholder="Transporteur (ex: DHL, Flash Express)" value={carrierInput} onChangeText={setCarrierInput}
              style={{ borderWidth: 1, borderColor: COLORS.hairline, borderRadius: RADIUS.sm, padding: 10, marginBottom: 10, fontSize: 14 }} />
            <TextInput placeholder="Numéro de suivi (obligatoire)" value={trackingInput} onChangeText={setTrackingInput}
              style={{ borderWidth: 1, borderColor: COLORS.hairline, borderRadius: RADIUS.sm, padding: 10, marginBottom: 16, fontSize: 14 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setTrackingModal(null)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: COLORS.mute, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmTrackingModal} style={{ flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: COLORS.white, fontWeight: '700' }}>Marquer expédiée</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!failureModal} transparent animationType="fade" onRequestClose={() => setFailureModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 4 }}>Signaler un échec de livraison</Text>
            <Text style={{ fontSize: 12, color: COLORS.mute, marginBottom: 16 }}>Décrivez brièvement ce qui s'est passé (obligatoire).</Text>
            <TextInput placeholder="Ex: adresse introuvable, colis refusé..." value={failureReason} onChangeText={setFailureReason} multiline
              style={{ borderWidth: 1, borderColor: COLORS.hairline, borderRadius: RADIUS.sm, padding: 10, marginBottom: 16, fontSize: 14, minHeight: 70 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setFailureModal(null)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: COLORS.mute, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmFailureModal} style={{ flex: 1, backgroundColor: '#EF4444', borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: COLORS.white, fontWeight: '700' }}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
