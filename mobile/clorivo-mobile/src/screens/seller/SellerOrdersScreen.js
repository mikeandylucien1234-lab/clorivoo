import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOW } from '../../lib/tokens';
import { EmptyState } from '../../components/UI';
import { getSellerOrders, advanceItemFulfillment } from '../../lib/supabase';
import { useSession } from '../../hooks/useSession';

// These track order_items.fulfillment_status (Phase 4) — NOT orders.status.
// A plain seller can no longer write orders.status at all (RLS + the
// protect_order_fields trigger block it); they can only move their own
// order_items rows forward one step, which protect_order_item_fields
// enforces server-side regardless of what this screen sends.
const STATUS_COLOR = { pending: '#F59E0B', processing: COLORS.primary, shipped: '#3B82F6', delivered: '#10B981' };
const STATUS_LABEL = { pending: 'En attente', processing: 'En préparation', shipped: 'Expédiée', delivered: 'Livrée' };
const NEXT_STATUS  = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };
const NEXT_LABEL   = { pending: 'Confirmer', processing: 'Marquer expédiée', shipped: 'Marquer livrée' };

export default function SellerOrdersScreen({ navigation }) {
  const session = useSession();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState(null);

  const reload = useCallback(() => {
    if (!session?.user) return;
    getSellerOrders(session.user.id, 50).then(data => { setOrders(data ?? []); setLoading(false); });
  }, [session]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // Advances exactly one order_item that belongs to this seller. Never
  // touches, or even sees, another vendor's items on the same order — a
  // multi-vendor order is never shown as "delivered" based on this
  // seller's own progress alone, since each item carries its own status.
  function advanceItem(order, item) {
    const next = NEXT_STATUS[item.fulfillment_status];
    if (!next) return;
    Alert.alert(NEXT_LABEL[item.fulfillment_status], `Passer "${item.title}" (commande #${order.id.slice(0,8).toUpperCase()}) à "${STATUS_LABEL[next]}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: async () => {
        setBusyItemId(item.id);
        try {
          await advanceItemFulfillment(item.id, next);
          // Only update local state after Supabase confirms the write —
          // never optimistically, so a blocked/failed update never shows
          // a status that isn't actually in the database.
          setOrders(prev => prev.map(o => o.id !== order.id ? o : {
            ...o, items: o.items.map(it => it.id === item.id ? { ...it, fulfillment_status: next } : it),
          }));
        } catch (e) {
          Alert.alert('Erreur', e.message ?? "Impossible de mettre à jour cet article. Réessayez.");
        } finally {
          setBusyItemId(null);
        }
      }},
    ]);
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
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>Commandes reçues</Text>
      </View>

      {orders.length === 0 ? (
        <EmptyState icon="📦" title="Aucune commande" subtitle="Les commandes de vos clients apparaîtront ici" />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {orders.map(order => (
            <View key={order.id} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={{ fontSize: 13, color: COLORS.mute }}>
                  {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>

              {/* One row per item THIS seller owns on the order — other
                  vendors' items on a multi-vendor order never appear here
                  and are never implied by this view. */}
              {order.items.map((item, i) => {
                const status = item.fulfillment_status ?? 'pending';
                const color  = STATUS_COLOR[status] ?? COLORS.mute;
                const canAdvance = !!NEXT_STATUS[status];
                const busy = busyItemId === item.id;
                return (
                  <View key={item.id} style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: COLORS.hairline, paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>{item.title}</Text>
                        <Text style={{ fontSize: 12, color: COLORS.mute }}>Qté {item.quantity} · ${Number(item.unit_price).toFixed(2)}</Text>
                      </View>
                      <View style={{ backgroundColor: color + '20', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color }}>{STATUS_LABEL[status] ?? status}</Text>
                      </View>
                    </View>
                    {canAdvance && (
                      <TouchableOpacity disabled={busy} onPress={() => advanceItem(order, item)}
                        style={{ backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center', opacity: busy ? 0.5 : 1 }}>
                        {busy ? <ActivityIndicator color={COLORS.primary} size="small" /> : (
                          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>{NEXT_LABEL[status]} →</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
