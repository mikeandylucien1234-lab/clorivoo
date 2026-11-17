import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Dimensions, Platform, StatusBar, Alert, ActivityIndicator,
  Modal, FlatList, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/layout/BackButton';
import { createPickupRequest, getMyPickupRequests, subscribeToPickups } from '@jjsimex/supabase/pickup';
import type { PickupRequest } from '@jjsimex/supabase/pickup';
import { Truck, MapPin, Calendar, Clock, Package, MessageCircle } from 'lucide-react-native';
import { QRCodeMini } from '@/components/ui/QRCodeDisplay';

const { width } = Dimensions.get('window');
const ACCENT = '#22C55E';
const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const WA_NUMBER = '18097851234';

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'rgba(34,197,94,0.14)', color: '#22C55E', label: 'En attente' },
  confirmed: { bg: 'rgba(59,130,246,0.16)', color: '#60A5FA', label: 'Confirmé' },
  collected: { bg: 'rgba(34,197,94,0.14)', color: '#22C55E', label: 'Collecté' },
  cancelled: { bg: '#2A2A2A', color: '#9CA3AF', label: 'Annulé' },
};

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const TIME_SLOTS = [
  { label: '8h00', value: '08:00' },
  { label: '9h00', value: '09:00' },
  { label: '10h00', value: '10:00' },
  { label: '11h00', value: '11:00' },
  { label: '12h00', value: '12:00' },
  { label: '13h00', value: '13:00' },
  { label: '14h00', value: '14:00' },
  { label: '15h00', value: '15:00' },
  { label: '16h00', value: '16:00' },
  { label: '17h00', value: '17:00' },
  { label: '18h00', value: '18:00' },
];

function formatDateDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}

function getTimeLabel(value: string): string {
  const slot = TIME_SLOTS.find((s) => s.value === value);
  return slot ? slot.label : value;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Mon ... 6=Sun
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function CalendarModal({
  visible,
  onClose,
  selectedDate,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (iso: string) => void;
}) {
  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    if (visible) {
      if (selectedDate) {
        const [y, m] = selectedDate.split('-').map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
    }
  }, [visible]);

  const days = useMemo(() => {
    const total = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const cells: ({ day: number; iso: string; disabled: boolean } | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      const iso = toISO(viewYear, viewMonth, d);
      cells.push({ day: d, iso, disabled: iso < todayISO });
    }
    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cs.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cs.card} onPress={() => {}}>
          {/* Month nav */}
          <View style={cs.nav}>
            <TouchableOpacity onPress={prevMonth} disabled={!canGoPrev} style={cs.arrow}>
              <Text style={[cs.arrowText, !canGoPrev && { opacity: 0.25 }]}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={cs.monthLabel}>
              {MONTHS_FR[viewMonth].charAt(0).toUpperCase() + MONTHS_FR[viewMonth].slice(1)} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={cs.arrow}>
              <Text style={cs.arrowText}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={cs.row}>
            {DAYS_FR.map((d) => (
              <View key={d} style={cs.cell}>
                <Text style={cs.dayHeader}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {days.map((cell, i) => (
              <View key={i} style={cs.cell}>
                {cell ? (
                  <TouchableOpacity
                    disabled={cell.disabled}
                    onPress={() => { onSelect(cell.iso); onClose(); }}
                    style={[
                      cs.dayBtn,
                      cell.iso === selectedDate && { backgroundColor: ACCENT },
                      cell.iso === todayISO && cell.iso !== selectedDate && { borderWidth: 1, borderColor: ACCENT },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        cs.dayText,
                        cell.disabled && { color: '#444' },
                        cell.iso === selectedDate && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cs = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    width: width - 48, backgroundColor: '#1A1A1A',
    borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#2A2A2A',
  },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 20, color: '#FFFFFF', fontWeight: '700' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  row: { flexDirection: 'row' },
  cell: { width: (width - 48 - 36) / 7, alignItems: 'center', marginBottom: 4 },
  dayHeader: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 6 },
  dayBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dayText: { fontSize: 14, color: '#FFFFFF' },
});

export default function PickupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [addr, setAddr] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const loadPickups = () => getMyPickupRequests(session.user.id)
      .then(setRequests)
      .catch(() => {});
    loadPickups().finally(() => setLoadingList(false));
    const unsub = subscribeToPickups(() => { loadPickups(); });
    return unsub;
  }, [session?.user?.id]);

  async function handleSubmit() {
    if (!addr.trim() || !date || !time) {
      Alert.alert('Champs requis', 'Veuillez remplir l\'adresse, la date et l\'heure.');
      return;
    }
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const pickup = await createPickupRequest({
        pickup_address: addr.trim(),
        pickup_date: date,
        pickup_time: time,
        estimated_weight: weight ? parseFloat(weight) : undefined,
        notes: notes.trim() || undefined,
      }, session.user.id);
      setRequests((prev) => [pickup, ...prev]);
      setAddr('');
      setWeight('');
      setNotes('');
      Alert.alert('Demande envoyée', 'Votre demande de pickup a été enregistrée.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  function openWhatsApp() {
    const msg = encodeURIComponent(
      `Bonjour JJ's IMEX,\n\nJe souhaite planifier un pickup à domicile.\n\n📍 Adresse : ${addr || '(à préciser)'}\n📅 Date : ${date || '(à préciser)'}\n🕐 Heure : ${time || '(à préciser)'}\n📦 Poids estimé : ${weight ? weight + ' lbs' : '(non précisé)'}\n\nMerci !`
    );
    Linking.openURL(`https://wa.me/${WA_NUMBER}?text=${msg}`);
  }

  function formatWhen(d: string, t: string) {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    try {
      const dt = new Date(d + 'T12:00:00');
      return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()} · ${(t || '').substring(0, 5).replace(':', 'h')}`;
    } catch {
      return `${d} · ${t}`;
    }
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <BackButton />
        <Text style={s.headerTitle}>Pickup à domicile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Truck size={26} color="#FFFFFF" strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>On vient chercher votre colis</Text>
            <Text style={s.bannerSub}>Plus besoin de vous déplacer, on collecte directement chez vous.</Text>
          </View>
        </View>

        {/* Form */}
        <View style={s.formCard}>
          <Text style={s.inputLabel}>Adresse de récupération</Text>
          <View style={s.inputWrap}>
            <MapPin size={17} color={ACCENT} style={s.inputIcon} />
            <TextInput
              style={s.inputWithIcon}
              value={addr}
              onChangeText={setAddr}
              placeholder="15490 NW 7th Ave, Miami, FL"
              placeholderTextColor="#5B6470"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>Date souhaitée</Text>
              <TouchableOpacity style={s.inputWrap} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                <Calendar size={16} color={ACCENT} style={s.inputIcon} />
                <View style={s.inputWithIcon} pointerEvents="none">
                  <Text style={date ? s.pickerText : s.pickerPlaceholder}>
                    {date ? formatDateDisplay(date) : '25 juin 2026'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>Heure souhaitée</Text>
              <TouchableOpacity style={s.inputWrap} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
                <Clock size={16} color={ACCENT} style={s.inputIcon} />
                <View style={s.inputWithIcon} pointerEvents="none">
                  <Text style={time ? s.pickerText : s.pickerPlaceholder}>
                    {time ? getTimeLabel(time) : '14h00'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[s.inputLabel, { marginTop: 16 }]}>Poids estimé (lbs)</Text>
          <View style={s.inputWrap}>
            <Package size={17} color={ACCENT} style={s.inputIcon} />
            <TextInput
              style={s.inputWithIcon}
              value={weight}
              onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
              placeholder="2.4"
              placeholderTextColor="#5B6470"
              keyboardType="numeric"
            />
          </View>

          <Text style={[s.inputLabel, { marginTop: 16 }]}>Notes pour le livreur</Text>
          <TextInput
            style={s.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Étage, code d'accès, instructions spéciales..."
            placeholderTextColor="#5B6470"
            multiline
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.ctaBtn, (!addr.trim() || !date || !time) && { opacity: 0.4 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!addr.trim() || !date || !time || loading}
        >
          {loading ? <ActivityIndicator color="#0D0D0D" /> : <Text style={s.ctaBtnText}>Envoyer la demande</Text>}
        </TouchableOpacity>

        {/* WhatsApp option */}
        <View style={s.waCard}>
          <Text style={s.waCardTitle}>Ou contactez-nous directement</Text>
          <TouchableOpacity style={s.waBtn} onPress={openWhatsApp} activeOpacity={0.85}>
            <MessageCircle size={18} color="#22C55E" strokeWidth={1.9} />
            <Text style={s.waBtnText}>Planifier via WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Requests list */}
        <Text style={s.listTitle}>Mes demandes de pickup</Text>

        {loadingList ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
        ) : requests.length === 0 ? (
          <Text style={s.emptyText}>Aucune demande de pickup pour le moment.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {requests.map((r) => {
              const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.cancelled;
              return (
                <View key={r.id} style={s.reqCard}>
                  <View style={s.reqIcon}>
                    <Truck size={20} color={ACCENT} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {(r as any).reference_number && <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '700', marginBottom: 1 }}>{(r as any).reference_number}</Text>}
                    <Text style={s.reqAddr} numberOfLines={1}>{r.pickup_address}</Text>
                    <Text style={s.reqWhen}>{formatWhen(r.pickup_date, r.pickup_time)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[s.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    {(r as any).reference_number && (
                      <QRCodeMini type="pickup" referenceNumber={(r as any).reference_number} id={r.id} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Date picker modal */}
      <CalendarModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={date}
        onSelect={setDate}
      />

      {/* Time picker modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <TouchableOpacity style={ts.overlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
          <View style={ts.card}>
            <Text style={ts.title}>Choisir l'heure</Text>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[ts.slot, item.value === time && { backgroundColor: ACCENT }]}
                  onPress={() => { setTime(item.value); setShowTimePicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[ts.slotText, item.value === time && { color: '#FFFFFF', fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const ts = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    width: width - 80, backgroundColor: '#1A1A1A',
    borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#2A2A2A',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 14, textAlign: 'center' },
  slot: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, backgroundColor: '#111111',
  },
  slotText: { fontSize: 15, color: '#FFFFFF' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: statusBarH + 10, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  banner: {
    backgroundColor: ACCENT, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 15,
  },
  bannerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 },
  bannerSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 18 },

  formCard: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, padding: 18, marginTop: 16,
  },

  inputLabel: { fontSize: 12.5, fontWeight: '600', color: '#C9CDD3', marginBottom: 8 },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 13, top: 15, zIndex: 1 },
  inputWithIcon: {
    width: '100%', height: 48, backgroundColor: '#111111',
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8,
    color: '#FFFFFF', paddingLeft: 40, paddingRight: 14,
    fontSize: 14, justifyContent: 'center',
  },
  pickerText: { color: '#FFFFFF', fontSize: 14 },
  pickerPlaceholder: { color: '#5B6470', fontSize: 14 },
  textarea: {
    width: '100%', height: 78, backgroundColor: '#111111',
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8,
    color: '#FFFFFF', padding: 12, paddingTop: 12,
    fontSize: 14, textAlignVertical: 'top', lineHeight: 21,
  },

  ctaBtn: {
    marginTop: 16, width: '100%', height: 54,
    backgroundColor: ACCENT, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#0D0D0D' },

  waCard: {
    marginTop: 16, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  waCardTitle: { fontSize: 12.5, color: '#9CA3AF', marginBottom: 12 },
  waBtn: {
    width: '100%', height: 48, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  waBtnText: { fontSize: 14, fontWeight: '700', color: '#22C55E' },

  listTitle: { fontWeight: '700', fontSize: 17, color: '#FFFFFF', marginTop: 28, marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 12 },

  reqCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, padding: 14,
  },
  reqIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  reqAddr: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },
  reqWhen: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },

  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99 },
  badgeText: { fontSize: 10.5, fontWeight: '700' },
});
