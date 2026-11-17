import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateShipping, getDestinationCities, subscribeToShippingRates } from '@jjsimex/supabase/shipping';
import type { TransportMode, DestinationCountry, ShippingResult } from '@jjsimex/supabase/shipping';

function CustomSlider({ min, max, step, value, onChange, colors }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; colors: any;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  function adjust(delta: number) {
    const next = Math.round((value + delta) / step) * step;
    onChange(Math.max(min, Math.min(max, next)));
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <TouchableOpacity onPress={() => adjust(-step * 5)} activeOpacity={0.7}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>−</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
        <View style={{ width: `${pct}%`, height: 6, backgroundColor: '#22C55E', borderRadius: 3 }} />
      </View>
      <TouchableOpacity onPress={() => adjust(step * 5)} activeOpacity={0.7}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Badges fidélité ───────────────────────────────────────────────────────────

const LEVEL_STYLE = {
  bronze: { bg: 'rgba(180,100,40,0.2)', color: '#CD7F32', label: '🥉 Bronze' },
  silver: { bg: 'rgba(150,150,150,0.2)', color: '#C0C0C0', label: '🥈 Silver — 5% de réduction' },
  gold:   { bg: 'rgba(249,180,0,0.2)',   color: '#FFD700', label: '🥇 Gold — 10% de réduction' },
};

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function CalculateurScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [mode, setMode] = useState<TransportMode>('air');
  const [dest, setDest] = useState<DestinationCountry>('haiti');
  const [city, setCity] = useState('Port-au-Prince');
  const [weight, setWeight] = useState(5);
  const [value, setValue] = useState(50);
  const [cities, setCities] = useState<{ haiti: string[]; dr: string[] }>({
    haiti: ['Port-au-Prince', 'Cap-Haïtien', 'Pétion-Ville', 'Les Cayes', 'Gonaïves', 'Jacmel'],
    dr: ['Santo Domingo', 'Santiago', 'Punta Cana'],
  });

  const [result, setResult] = useState<ShippingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charger les villes depuis Supabase au montage
  useEffect(() => {
    getDestinationCities().then(c => {
      setCities(c);
      if (!c.haiti.includes(city)) setCity(c.haiti[0] ?? 'Port-au-Prince');
    }).catch(() => {});
  }, []);

  // Recalcul avec debounce 300ms
  const recalculate = useCallback((
    w: number, m: TransportMode, d: DestinationCountry, c: string,
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await calculateShipping({
          destination_city: c,
          destination_country: d,
          transport_mode: m,
          real_weight_lbs: w,
          user_id: profile?.id,
        });
        setResult(res);
      } catch {
        // Calcul local en fallback
        const rates: Record<DestinationCountry, { air: number; sea: number }> = {
          haiti: { air: 9.5, sea: 4.5 },
          dr: { air: 11, sea: 5.5 },
        };
        const rate = m === 'air' ? rates[d].air : rates[d].sea;
        const base = Math.max(5, Math.round(w * rate * 100) / 100);
        setResult({
          volumetric_weight: 0, billed_weight: w, base_price: base,
          loyalty_discount_percent: 0, loyalty_discount_amount: 0, final_price: base,
          transport_mode: m, estimated_days_min: m === 'air' ? 5 : 21, estimated_days_max: m === 'air' ? 7 : 28,
          estimated_delivery_date: '', rate_per_lb_used: rate, loyalty_level: null,
        });
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [profile?.id]);

  // Déclenche au changement de n'importe quel paramètre
  useEffect(() => { recalculate(weight, mode, dest, city); }, [weight, mode, dest, city, recalculate]);

  // Realtime: re-calcule si un tarif change côté admin
  useEffect(() => {
    const unsub = subscribeToShippingRates(() => recalculate(weight, mode, dest, city));
    return unsub;
  }, [weight, mode, dest, city, recalculate]);

  function handleModeChange(m: TransportMode) {
    setMode(m);
  }

  function handleDestChange(d: DestinationCountry) {
    setDest(d);
    const available = cities[d];
    setCity(available[0] ?? '');
  }

  const currentCities = cities[dest] ?? [];
  const hasInsurance = value <= 100;
  const ls = result?.loyalty_level ? LEVEL_STYLE[result.loyalty_level] : null;
  const price = result?.final_price ?? 0;
  const deliveryText = mode === 'air'
    ? `${result?.estimated_days_min ?? 5}-${result?.estimated_days_max ?? 7} ${t('business_days')}`
    : `${Math.round((result?.estimated_days_min ?? 21) / 7)}-${Math.round((result?.estimated_days_max ?? 28) / 7)} ${t('weeks')}`;

  return (
    <View style={[S.container, { backgroundColor: colors.bg }]}>
      <View style={[S.header, { backgroundColor: colors.bg, borderBottomColor: colors.card }]}>
        <TouchableOpacity style={[S.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={{ color: colors.text, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.text }]}>{t('calculator_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>

        {/* Mode transport */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {([['air', t('air_plane'), t('air_days')], ['sea', t('sea_boat'), t('sea_weeks')]] as [TransportMode, string, string][]).map(([m, label, sub]) => (
            <TouchableOpacity key={m} onPress={() => handleModeChange(m)} activeOpacity={0.8}
              style={[S.modeBtn, { backgroundColor: colors.card, borderColor: colors.border }, mode === m && S.modeBtnActive]}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: mode === m ? '#22C55E' : colors.text }}>{label}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Destination pays */}
        <Text style={[S.label, { color: colors.textSecondary }]}>{t('destination')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          {(['haiti', 'dr'] as DestinationCountry[]).map(d => (
            <TouchableOpacity key={d} onPress={() => handleDestChange(d)} activeOpacity={0.8}
              style={[S.destBtn, { backgroundColor: colors.card, borderColor: colors.border }, dest === d && S.destBtnActive]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: dest === d ? '#22C55E' : colors.textSecondary }}>
                {d === 'haiti' ? '🇭🇹 Haïti' : '🇩🇴 Rép. Dominicaine'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sélecteur ville */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {currentCities.map(c => (
              <TouchableOpacity key={c} onPress={() => setCity(c)} activeOpacity={0.8}
                style={{ height: 36, borderRadius: 99, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: city === c ? '#22C55E' : colors.card,
                  borderWidth: 1, borderColor: city === c ? '#22C55E' : colors.border }}>
                <Text style={{ color: city === c ? '#0D0D0D' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Slider poids */}
        <View style={{ marginBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={[S.label, { color: colors.textSecondary }]}>{t('package_weight')}</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#22C55E', letterSpacing: -0.5 }}>{weight.toFixed(1)} lbs</Text>
          </View>
          <CustomSlider min={0.5} max={150} step={0.5} value={weight} onChange={setWeight} colors={colors} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {['0.5', '25', '50', '75', '100+'].map(v => (
              <Text key={v} style={{ fontSize: 11, color: colors.textMuted }}>{v}</Text>
            ))}
          </View>
        </View>

        {/* Slider valeur déclarée */}
        <View style={{ marginBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={[S.label, { color: colors.textSecondary }]}>{t('package_value')}</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#22C55E', letterSpacing: -0.5 }}>${value}</Text>
          </View>
          <CustomSlider min={0} max={500} step={5} value={value} onChange={setValue} colors={colors} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {['$0', '$100', '$200', '$500'].map(v => (
              <Text key={v} style={{ fontSize: 11, color: colors.textMuted }}>{v}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
            {t('insurance_included')}
          </Text>
        </View>

        {/* Carte résultat */}
        <View style={[S.resultCard, { backgroundColor: colors.card }]}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>{t('your_estimate')}</Text>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator color="#22C55E" size="large" />
            </View>
          ) : (
            <>
              {/* Prix avant réduction */}
              {result && result.loyalty_discount_percent > 0 && (
                <Text style={{ fontSize: 18, color: colors.textMuted, textAlign: 'center', marginTop: 8, textDecorationLine: 'line-through' }}>
                  ${result.base_price.toFixed(2)}
                </Text>
              )}
              <Text style={{ fontSize: 52, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -1.5, lineHeight: 60, marginTop: 4 }}>
                ${price.toFixed(2)}
              </Text>

              {/* Badge fidélité */}
              {ls && (
                <View style={{ alignSelf: 'center', backgroundColor: ls.bg, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 }}>
                  <Text style={{ color: ls.color, fontSize: 12, fontWeight: '700' }}>{ls.label}</Text>
                </View>
              )}

              {/* Si non connecté */}
              {!profile && (
                <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.8}
                  style={{ marginTop: 10, backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }}>
                    {t('connect_discounts')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <View style={{ backgroundColor: colors.border, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 7 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{weight.toFixed(1)} {t('lbs_billed')}</Text>
            </View>
            <View style={{ backgroundColor: '#C2600A', borderRadius: 99, paddingHorizontal: 13, paddingVertical: 7 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{mode === 'air' ? t('air_plane') : t('sea_boat')}</Text>
            </View>
            <View style={{ backgroundColor: colors.border, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 7 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{city}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Text style={{ color: '#22C55E', fontSize: 16 }}>📅</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{t('delivery_approx')} {deliveryText}</Text>
          </View>

          {result?.estimated_delivery_date ? (
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
              {t('estimated_on')} {result.estimated_delivery_date}
            </Text>
          ) : null}

          {/* Mini timeline */}
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {[t('departure'), t('transit'), t('arrival'), t('delivery')].map((step, i) => (
                <View key={step} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i === 0 ? '#22C55E' : colors.border }} />
                  {i < 3 && <View style={{ flex: 1, height: 2, backgroundColor: colors.border }} />}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              {[t('departure'), t('transit'), t('arrival'), t('delivery')].map((step, i) => (
                <Text key={step} style={{ fontSize: 10, color: i === 0 ? '#22C55E' : colors.textMuted, fontWeight: i === 0 ? '600' : '400', width: 50, textAlign: i === 0 ? 'left' : i === 3 ? 'right' : 'center' }}>{step}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Assurance dynamique */}
        {hasInsurance ? (
          <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Text style={{ fontSize: 22 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#22C55E' }}>{t('covered_100')}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{t('free_insurance')}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700' }}>{t('included')}</Text>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: 'rgba(34,197,94,0.10)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#22C55E' }}>{t('value_exceeds')}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{t('extra_coverage')} ${value - 100} {t('additional_coverage')}</Text>
            <TouchableOpacity activeOpacity={0.8} style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '600', textDecorationLine: 'underline' }}>{t('add_coverage')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Détail tarif */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginTop: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{t('rate_detail')}</Text>
          {[
            [`${t('shipping_fees')} (${weight.toFixed(1)} lbs × $${result?.rate_per_lb_used?.toFixed(2) ?? '—'}/lb)`, `$${result?.base_price?.toFixed(2) ?? '—'}`],
            [t('insurance_up_100'), t('free')],
            ...(result && result.loyalty_discount_percent > 0
              ? [[`Réduction ${result.loyalty_level} (−${result.loyalty_discount_percent}%)`, `−$${result.loyalty_discount_amount.toFixed(2)}`]]
              : []),
            [t('handling'), t('included')],
          ].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{k}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: v.startsWith('−') ? '#22C55E' : v === t('free') || v === t('included') ? '#22C55E' : colors.text }}>{v}</Text>
            </View>
          ))}
          {result && result.loyalty_discount_percent > 0 && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{t('total')}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#22C55E' }}>${result.final_price.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => router.push('/shopper')} activeOpacity={0.9}
          style={{ marginTop: 22, height: 54, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#0D0D0D', fontWeight: '700', fontSize: 16 }}>{t('order_now')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', backgroundColor: '#0D0D0D' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  label: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginBottom: 8 },
  modeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, backgroundColor: '#1A1A1A', borderColor: '#2A2A2A', marginBottom: 22 },
  modeBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' },
  destBtn: { flex: 1, height: 46, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  destBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' },
  resultCard: { backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#22C55E', borderRadius: 20, padding: 24, shadowColor: '#22C55E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 30, elevation: 8 },
});
