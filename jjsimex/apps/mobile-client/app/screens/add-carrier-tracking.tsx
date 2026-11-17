import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/layout/BackButton';
import { addCarrierTracking } from '@jjsimex/supabase/packages';
import { ChevronDown, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const CARRIERS = ['UPS', 'FedEx', 'USPS', 'Amazon Logistics', 'DHL', 'Autre'];

export default function AddCarrierTrackingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, isDark } = useTheme();
  const ACCENT = colors.accent;
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ packageId: string; requestNumber: string }>();
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    if (!carrier || !trackingNumber || !session?.user?.id || !params.packageId) return;
    setLoading(true);
    try {
      await addCarrierTracking(params.packageId, session.user.id, carrier, trackingNumber);
      setDone(true);
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <CheckCircle size={72} color="#22C55E" strokeWidth={1.5} />
          <Text style={[s.doneTitle, { color: colors.text }]}>{t('tracking_added')}</Text>
          <Text style={[s.doneDesc, { color: colors.textSecondary }]}>
            {t('tracking_added_desc')}
          </Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/(tabs-client)/')} activeOpacity={0.85}>
            <Text style={s.ctaBtnText}>{t('back_to_home')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={s.header}>
        <BackButton />
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('carrier_tracking')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {params.requestNumber && (
          <View style={[s.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.refLabel, { color: colors.textMuted }]}>{t('request_ref')}</Text>
            <Text style={s.refValue}>{params.requestNumber}</Text>
          </View>
        )}

        <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('carrier')}</Text>
        <TouchableOpacity style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowPicker(!showPicker)} activeOpacity={0.8}>
          <Text style={{ color: carrier ? colors.text : colors.textMuted, fontSize: 15 }}>{carrier || t('choose_carrier')}</Text>
          <ChevronDown size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {showPicker && (
          <View style={[s.pickerList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {CARRIERS.map((c) => (
              <TouchableOpacity key={c} style={[s.pickerItem, { borderBottomColor: colors.border }]} onPress={() => { setCarrier(c); setShowPicker(false); }}>
                <Text style={[s.pickerItemText, { color: colors.text }, carrier === c && { color: ACCENT }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('tracking_number_input')}</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={trackingNumber}
          onChangeText={setTrackingNumber}
          placeholder="Ex: 1Z999AA10123456784"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
      </ScrollView>

      <View style={[s.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.card }]}>
        <TouchableOpacity
          style={[s.ctaBtn, (!carrier || !trackingNumber) && { opacity: 0.4 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!carrier || !trackingNumber || loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaBtnText}>{t('save')}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: statusBarH + 10, paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  refCard: {
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center',
  },
  refLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  refValue: { fontSize: 18, fontWeight: '800', color: ACCENT },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#FFFFFF', borderWidth: 1, borderColor: '#2A2A2A',
  },

  dropdown: {
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerList: { backgroundColor: '#1A1A1A', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden' },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  pickerItemText: { fontSize: 15, color: '#FFFFFF' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 30, backgroundColor: '#0D0D0D',
    borderTopWidth: 1, borderTopColor: '#1A1A1A',
  },
  ctaBtn: {
    height: 56, borderRadius: 16, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  doneTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 20, marginBottom: 8 },
  doneDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginTop: 8, paddingHorizontal: 20, marginBottom: 24 },
});
