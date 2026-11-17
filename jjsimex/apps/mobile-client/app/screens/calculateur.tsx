import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
  Platform, StatusBar, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { calculateShipping, getShippingRates } from '@jjsimex/supabase/shipping';
import type { ShippingRate } from '@jjsimex/supabase/shipping';
import { BackButton } from '@/components/layout/BackButton';
import { Slider } from '@/components/ui/Slider';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const COUNTRY_LABELS: Record<string, string> = {
  haiti: '🇭🇹 Haïti',
  dr: '🇩🇴 République Dominicaine',
};

function safeNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export default function CalculateurScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const ACCENT = colors.accent;

  const [transport, setTransport] = useState<'air' | 'sea'>('air');
  const [weight, setWeight] = useState(5);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<'haiti' | 'dr'>('haiti');
  const [selectedCity, setSelectedCity] = useState('');
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [result, setResult] = useState<{
    basePrice: number;
    finalPrice: number;
    loyaltyDiscount: number;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const priceAnim = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const countries = [...new Set(rates.map(r => r.destination_country))] as ('haiti' | 'dr')[];
  const cities = [...new Set(rates.filter(r => r.destination_country === selectedCountry).map(r => r.destination_city))];

  useEffect(() => {
    getShippingRates().then(r => {
      setRates(r);
      if (r.length > 0) {
        setSelectedCountry(r[0].destination_country as 'haiti' | 'dr');
        setSelectedCity(r[0].destination_city);
      }
    }).catch(() => {});
  }, []);

  const calculate = useCallback(async () => {
    if (!selectedCity) return;
    setLoading(true);
    try {
      const res = await calculateShipping({
        real_weight_lbs: weight,
        destination_country: selectedCountry,
        destination_city: selectedCity,
        transport_mode: transport,
        user_id: session?.user?.id,
      });
      setResult({
        basePrice: safeNum(res.base_price),
        finalPrice: safeNum(res.final_price),
        loyaltyDiscount: safeNum(res.loyalty_discount_amount),
        estimatedDaysMin: safeNum(res.estimated_days_min),
        estimatedDaysMax: safeNum(res.estimated_days_max),
      });
      Animated.sequence([
        Animated.timing(priceAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.spring(priceAnim, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 200 }),
      ]).start();
    } catch {}
    setLoading(false);
  }, [weight, selectedCountry, selectedCity, transport, session]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(calculate, 300);
    return () => clearTimeout(debounceRef.current);
  }, [calculate]);

  const estimatedDays = result
    ? `${result.estimatedDaysMin}-${result.estimatedDaysMax} jours`
    : transport === 'air' ? '5-7 jours' : '21-28 jours';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>Calculateur</Text>
          <Text style={styles.subtitle}>Estimez vos frais d'expedition</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Transport toggle */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Mode de transport</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            {([['air', '✈️ Avion', '5-7 jours'], ['sea', '🚢 Bateau', '3-4 semaines']] as const).map(([mode, label, sub]) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setTransport(mode)}
                style={[styles.modeBtn, transport === mode && styles.modeBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: transport === mode ? '#0D0D0D' : '#FFFFFF' }}>{label}</Text>
                <Text style={{ fontSize: 11, color: transport === mode ? 'rgba(0,0,0,0.6)' : '#9CA3AF', marginTop: 2 }}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Destination */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Destination</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10, paddingVertical: 2 }}>
            {countries.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setSelectedCountry(c);
                  const first = rates.find(r => r.destination_country === c);
                  if (first) setSelectedCity(first.destination_city);
                }}
                style={[styles.countryChip, selectedCountry === c && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: selectedCountry === c ? '#0D0D0D' : '#9CA3AF' }}>
                  {COUNTRY_LABELS[c] ?? c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* City dropdown */}
          {cities.length > 0 && (
            <TouchableOpacity
              style={styles.dropdown}
              activeOpacity={0.8}
              onPress={() => setCityModalVisible(true)}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: selectedCity ? '#FFFFFF' : '#9CA3AF', flex: 1 }}>
                {selectedCity || 'Choisir une ville'}
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>▼</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* City selection modal */}
        <Modal visible={cityModalVisible} transparent animationType="fade" onRequestClose={() => setCityModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCityModalVisible(false)}>
            <View style={styles.modalContent}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 }}>Choisir une ville</Text>
              <FlatList
                data={cities}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, selectedCity === item && styles.modalItemActive]}
                    onPress={() => { setSelectedCity(item); setCityModalVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, color: selectedCity === item ? '#0D0D0D' : '#FFFFFF', fontWeight: selectedCity === item ? '700' : '500' }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Weight slider */}
        <View style={styles.card}>
          <Slider
            min={0.5}
            max={50}
            value={weight}
            onChange={setWeight}
            step={0.5}
            label="Poids estime"
            formatValue={v => `${v} lbs`}
          />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Cette estimation est fournie a titre indicatif uniquement. Elle ne constitue pas un engagement de prix ni une offre de service definitive. Les frais reels pourront varier selon le poids final, les dimensions et les conditions d'expedition.
          </Text>
        </View>

        {/* Result */}
        {result && (
          <Animated.View style={[styles.resultCard, { transform: [{ scale: priceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }], opacity: priceAnim }]}>
            <Text style={styles.resultLabel}>Estimation totale</Text>
            <Text style={styles.resultPrice}>${safeNum(result.finalPrice).toFixed(2)}</Text>

            <View style={styles.resultRows}>
              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>Frais d'expedition</Text>
                <Text style={styles.resultRowValue}>${safeNum(result.basePrice).toFixed(2)}</Text>
              </View>
              {result.loyaltyDiscount > 0 && (
                <View style={styles.resultRow}>
                  <Text style={[styles.resultRowLabel, { color: '#22C55E' }]}>Reduction fidelite</Text>
                  <Text style={[styles.resultRowValue, { color: '#22C55E' }]}>-${safeNum(result.loyaltyDiscount).toFixed(2)}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <View style={styles.pill}><Text style={styles.pillText}>{weight} lbs</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>{transport === 'air' ? '✈️' : '🚢'} {transport === 'air' ? 'Avion' : 'Bateau'}</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>{selectedCity || (COUNTRY_LABELS[selectedCountry] ?? selectedCountry)}</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>📅 {estimatedDays}</Text></View>
            </View>

            {!session && (
              <View style={{ backgroundColor: colors.accentLight, borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' }}>
                <Text style={{ fontSize: 13, color: ACCENT, textAlign: 'center' }}>
                  Connectez-vous pour beneficier de vos reductions fidelite 🎁
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: statusBarH + 18, paddingHorizontal: 22 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#9CA3AF' },
  content: { padding: 20, gap: 14, paddingBottom: 50 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2A2A2A' },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  modeBtn: { flex: 1, backgroundColor: '#0D0D0D', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  modeBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  countryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#2A2A2A' },
  chipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  dropdown: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#0D0D0D', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A2A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalContent: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2A2A2A', width: '100%', maxHeight: '60%' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  modalItemActive: { backgroundColor: '#22C55E' },
  disclaimer: { padding: 16, backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' },
  disclaimerText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  resultCard: { backgroundColor: '#1A1A1A', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center' },
  resultLabel: { fontSize: 13, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultPrice: { fontSize: 48, fontWeight: '800', color: '#22C55E', letterSpacing: -1, marginVertical: 8 },
  resultRows: { width: '100%', gap: 8, marginTop: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resultRowLabel: { fontSize: 13, color: '#9CA3AF' },
  resultRowValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  pill: { backgroundColor: '#0D0D0D', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2A2A2A' },
  pillText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
});
