import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../../lib/tokens';
import { Btn, Input } from '../../components/UI';
import { createOrder } from '../../lib/supabase';
import { useSession } from '../../hooks/useSession';
import { sendLocalNotification } from '../../lib/notifications';
import { getShippingMethods } from '../../lib/cms';

const FALLBACK_SHIPPING = [
  { key: 'standard', emoji: '🚚', name: 'Standard', description: '5 à 8 jours', estimated_days: '5 à 8 jours', price: 3.99, free_threshold: 30 },
  { key: 'express',  emoji: '⚡', name: 'Express',  description: '2 à 3 jours', estimated_days: '2 à 3 jours', price: 8.99, free_threshold: null },
];

export default function CheckoutScreen({ route, navigation }) {
  const { items = [], subtotal = 0 } = route.params ?? {};
  const session = useSession();
  const [address, setAddress] = useState('');
  const [city, setCity]       = useState('');
  const [zip, setZip]         = useState('');
  const [loading, setLoading] = useState(false);
  const [method, setMethod]   = useState('standard');
  const [shippingMethods, setShippingMethods] = useState([]);

  useEffect(() => {
    getShippingMethods()
      .then(data => {
        setShippingMethods(data && data.length > 0 ? data : FALLBACK_SHIPPING);
      })
      .catch(() => setShippingMethods(FALLBACK_SHIPPING));
  }, []);

  const selectedMethod = shippingMethods.find(m => m.key === method);
  const shipping = selectedMethod?.free_threshold != null && subtotal >= selectedMethod.free_threshold
    ? 0
    : (selectedMethod?.price ?? 0);
  const total = subtotal + shipping;

  async function placeOrder() {
    if (!address || !city || !zip) { Alert.alert('Erreur', 'Remplissez tous les champs.'); return; }
    setLoading(true);
    try {
      const order = await createOrder(session.user.id, {
        line1: address, city, zip, country: 'FR',
      }, method);
      await sendLocalNotification('Commande passée', `Votre commande #${order?.id?.slice(0, 8) ?? '...'} est en attente de confirmation du paiement.`);
      navigation.replace('Tracking', { orderId: order?.id });
    } catch (e) {
      Alert.alert('Erreur', e.message ?? 'Impossible de passer la commande.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.paper }} edges={['top']}>
      <View style={{ backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.hairline, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text onPress={() => navigation.goBack()} style={{ fontSize: 22, color: COLORS.ink }}>←</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>Finaliser la commande</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
          {/* Delivery address */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 14 }}>Adresse de livraison</Text>
            <Input label="Adresse" value={address} onChangeText={setAddress} placeholder="Rue, numéro…" />
            <Input label="Ville" value={city} onChangeText={setCity} placeholder="Paris" />
            <Input label="Code postal" value={zip} onChangeText={setZip} placeholder="75001" keyboardType="numeric" />
          </View>

          {/* Shipping method */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 14 }}>Mode de livraison</Text>
            {shippingMethods.map(m => {
              const isFree = m.free_threshold != null && subtotal >= m.free_threshold;
              const priceLabel = isFree ? 'Gratuit' : `$${parseFloat(m.price ?? 0).toFixed(2)}`;
              return (
                <View
                  key={m.key}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={() => setMethod(m.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1.5, borderColor: method === m.key ? COLORS.primary : COLORS.hairline, borderRadius: RADIUS.sm, marginBottom: 8, backgroundColor: method === m.key ? COLORS.primarySoft : COLORS.white }}
                >
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: COLORS.ink }}>{m.name}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.mute }}>{m.estimated_days}</Text>
                  </View>
                  <Text style={{ fontWeight: '700', color: method === m.key ? COLORS.primary : COLORS.ink }}>{priceLabel}</Text>
                </View>
              );
            })}
          </View>

          {/* Order summary */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 4 }}>Résumé</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: COLORS.mute }}>Sous-total</Text>
              <Text style={{ color: COLORS.ink }}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: COLORS.mute }}>Livraison</Text>
              <Text style={{ color: shipping === 0 ? COLORS.success : COLORS.ink }}>{shipping === 0 ? 'Gratuite' : `$${shipping.toFixed(2)}`}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: COLORS.hairline }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.primary }}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={{ padding: 20, paddingBottom: 32, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.hairline }}>
          <Btn size="lg" onPress={placeOrder} disabled={loading}>
            {loading ? 'Traitement…' : `Payer $${total.toFixed(2)} →`}
          </Btn>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
