import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Plane, Ship, Calendar, MapPin, Weight, Package,
  Plus, Edit3, Lock, X, AlertTriangle, ChevronDown,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { sendPushToAll } from '@jjsimex/supabase/push';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const TABS = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'active', label: 'En cours' },
  { key: 'completed', label: 'Complétés' },
] as const;

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  open: { label: 'Ouvert', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  closed: { label: 'Fermé', bg: 'rgba(34,197,94,0.14)', color: ACCENT },
  departed: { label: 'Parti', bg: 'rgba(59,130,246,0.14)', color: '#3B82F6' },
  arrived: { label: 'Arrivé', bg: 'rgba(168,85,247,0.14)', color: '#A855F7' },
};

interface Departure {
  id: string;
  type: 'air' | 'sea';
  departure_date: string;
  origin: string;
  destinations: string[];
  capacity_lbs: number;
  used_capacity_lbs: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  package_count?: number;
}

function getTabStatuses(tab: string): string[] {
  if (tab === 'upcoming') return ['open', 'closed'];
  if (tab === 'active') return ['departed'];
  return ['arrived'];
}

export default function AdminDeparts() {
  const router = useRouter();
  const { profile } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editCapId, setEditCapId] = useState<string | null>(null);
  const [editCapValue, setEditCapValue] = useState('');

  // Create form state
  const [newType, setNewType] = useState<'air' | 'sea'>('air');
  const [newDate, setNewDate] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newDestinations, setNewDestinations] = useState('Port-au-Prince, Cap-Haïtien');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDepartures = useCallback(async () => {
    try {
      const statuses = getTabStatuses(tab);
      const { data } = await supabase
        .from('departures')
        .select('*')
        .in('status', statuses)
        .order('departure_date', { ascending: tab === 'upcoming' });

      const deps = (data ?? []) as Departure[];

      // Get package counts for each departure
      for (const d of deps) {
        const { count } = await supabase
          .from('packages')
          .select('id', { count: 'exact', head: true })
          .eq('departure_id', d.id);
        d.package_count = count ?? 0;
      }

      setDepartures(deps);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchDepartures(); }, [fetchDepartures]);

  useEffect(() => {
    const channel = supabase
      .channel('departures_admin_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departures' }, () => fetchDepartures())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDepartures]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchDepartures();
    setRefreshing(false);
  }

  function getCapacityPercent(d: Departure) {
    if (!d.capacity_lbs) return 0;
    return Math.min(100, Math.round(((d.used_capacity_lbs ?? 0) / d.capacity_lbs) * 100));
  }

  function getCapacityColor(pct: number) {
    if (pct >= 90) return '#EF4444';
    if (pct >= 70) return ACCENT;
    return '#22C55E';
  }

  async function handleCreate() {
    if (!newDate || !newCapacity || isNaN(Number(newCapacity))) {
      Alert.alert('Erreur', 'Date et capacité sont requis.');
      return;
    }
    setCreating(true);
    try {
      const dests = newDestinations.split(',').map(s => s.trim()).filter(Boolean);
      await supabase.from('departures').insert({
        type: newType,
        departure_date: newDate,
        origin: 'Miami, FL',
        destinations: dests,
        capacity_lbs: Number(newCapacity),
        used_capacity_lbs: 0,
        status: 'open',
        notes: newNotes.trim() || null,
        created_by: profile!.id,
      });

      const typeLabel = newType === 'air' ? 'Vol' : 'Bateau';
      const dateFormatted = new Date(newDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const destsLabel = dests.length > 0 ? dests.join(', ') : 'destination';
      sendPushToAll(
        `Nouveau départ ${typeLabel} 🚀`,
        `${typeLabel} prévu le ${dateFormatted} — Miami → ${destsLabel}. Envoyez vos colis !`,
      ).catch(e => console.error('Push error:', e));

      setShowCreate(false);
      setNewDate('');
      setNewCapacity('');
      setNewNotes('');
      fetchDepartures();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    setCreating(false);
  }

  async function handleUpdateCapacity(d: Departure) {
    if (!editCapValue || isNaN(Number(editCapValue))) return;
    try {
      await supabase.from('departures').update({ capacity_lbs: Number(editCapValue) }).eq('id', d.id);
      setEditCapId(null);
      fetchDepartures();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  function handleClose(d: Departure) {
    Alert.alert('Fermer le départ', `Fermer ce ${d.type === 'air' ? 'vol' : 'bateau'} ? Plus aucun colis ne pourra être assigné.`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Fermer', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('departures').update({ status: 'closed' }).eq('id', d.id);
            fetchDepartures();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function handleDepart(d: Departure) {
    Alert.alert('Marquer parti', `Confirmer le départ ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', onPress: async () => {
          try {
            await supabase.from('departures').update({ status: 'departed' }).eq('id', d.id);
            fetchDepartures();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function handleArrived(d: Departure) {
    Alert.alert('Marquer arrivé', `Confirmer l'arrivée ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', onPress: async () => {
          try {
            await supabase.from('departures').update({ status: 'arrived' }).eq('id', d.id);
            fetchDepartures();
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Départs</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.7}>
          <Plus size={18} color="#0D0D0D" strokeWidth={2.5} />
        </TouchableOpacity>
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

        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : departures.length === 0 ? (
          <Text style={s.emptyText}>Aucun départ dans cette catégorie.</Text>
        ) : (
          <View style={{ paddingHorizontal: 18, gap: 16 }}>
            {departures.map((d) => {
              const badge = STATUS_STYLE[d.status] ?? STATUS_STYLE.open;
              const pct = getCapacityPercent(d);
              const capColor = getCapacityColor(pct);
              const isAir = d.type === 'air';
              const remaining = Math.max(0, (d.capacity_lbs ?? 0) - (d.used_capacity_lbs ?? 0));

              return (
                <View key={d.id} style={s.card}>
                  {/* Header */}
                  <View style={s.cardHeader}>
                    <View style={[s.modeIcon, { backgroundColor: isAir ? 'rgba(59,130,246,0.12)' : 'rgba(6,182,212,0.12)' }]}>
                      {isAir ? <Plane size={20} color="#3B82F6" strokeWidth={1.8} /> : <Ship size={20} color="#06B6D4" strokeWidth={1.8} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{isAir ? 'Vol aérien' : 'Bateau maritime'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Calendar size={11} color="#6B7280" strokeWidth={1.8} />
                        <Text style={s.cardDate}>
                          {new Date(d.departure_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.statusText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                      {pct >= 80 && d.status === 'open' && (
                        <View style={s.almostFullBadge}>
                          <AlertTriangle size={10} color="#F59E0B" strokeWidth={2} />
                          <Text style={s.almostFullText}>Bientôt complet</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Destinations */}
                  <View style={s.destRow}>
                    <MapPin size={13} color="#6B7280" strokeWidth={1.8} />
                    <Text style={s.destText}>{d.origin} → {(d.destinations ?? []).join(', ') || 'Haïti'}</Text>
                  </View>

                  {/* Capacity block */}
                  <View style={s.capacityBlock}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Weight size={13} color="#6B7280" strokeWidth={1.8} />
                        <Text style={s.capLabel}>Capacité</Text>
                      </View>
                      {editCapId === d.id ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={s.capInput}
                            value={editCapValue}
                            onChangeText={setEditCapValue}
                            keyboardType="decimal-pad"
                            autoFocus
                          />
                          <TouchableOpacity onPress={() => handleUpdateCapacity(d)}>
                            <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 12 }}>OK</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setEditCapId(null)}>
                            <X size={14} color="#6B7280" strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          onPress={() => { setEditCapId(d.id); setEditCapValue(String(d.capacity_lbs ?? 0)); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.capValue, { color: capColor }]}>
                            {(d.used_capacity_lbs ?? 0).toFixed(0)} / {(d.capacity_lbs ?? 0).toFixed(0)} lbs
                          </Text>
                          <Edit3 size={11} color="#6B7280" strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: capColor }]} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={s.capStat}>Utilisé: {(d.used_capacity_lbs ?? 0).toFixed(0)} lbs</Text>
                      <Text style={[s.capStat, { color: capColor }]}>Restant: {remaining.toFixed(0)} lbs</Text>
                      <Text style={s.capStat}>{pct}%</Text>
                    </View>
                  </View>

                  {/* Package count */}
                  <View style={s.pkgCountRow}>
                    <Package size={13} color="#6B7280" strokeWidth={1.8} />
                    <Text style={s.pkgCountText}>{d.package_count ?? 0} colis assignés</Text>
                  </View>

                  {d.notes && <Text style={s.notesText}>📝 {d.notes}</Text>}

                  {/* Actions */}
                  {d.status === 'open' && (
                    <View style={s.actionsBlock}>
                      <TouchableOpacity style={s.departBtn} onPress={() => handleDepart(d)} activeOpacity={0.7}>
                        {isAir ? <Plane size={14} color="#FFFFFF" strokeWidth={2} /> : <Ship size={14} color="#FFFFFF" strokeWidth={2} />}
                        <Text style={s.departBtnText}>Marquer parti</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.closeBtn} onPress={() => handleClose(d)} activeOpacity={0.7}>
                        <Lock size={14} color="#EF4444" strokeWidth={2} />
                        <Text style={s.closeBtnText}>Fermer</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {d.status === 'closed' && (
                    <View style={s.actionsBlock}>
                      <TouchableOpacity style={s.departBtn} onPress={() => handleDepart(d)} activeOpacity={0.7}>
                        <Text style={s.departBtnText}>Marquer parti</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {d.status === 'departed' && (
                    <View style={s.actionsBlock}>
                      <TouchableOpacity style={[s.departBtn, { backgroundColor: '#A855F7' }]} onPress={() => handleArrived(d)} activeOpacity={0.7}>
                        <Text style={s.departBtnText}>Marquer arrivé</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* CREATE MODAL */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nouveau départ</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <X size={20} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Type toggle */}
              <Text style={s.formLabel}>Mode de transport</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[s.typeBtn, newType === 'air' && s.typeBtnActive]}
                  onPress={() => setNewType('air')}
                  activeOpacity={0.8}
                >
                  <Plane size={16} color={newType === 'air' ? '#0D0D0D' : '#9CA3AF'} strokeWidth={2} />
                  <Text style={[s.typeBtnText, newType === 'air' && s.typeBtnTextActive]}>Avion</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, newType === 'sea' && s.typeBtnActive]}
                  onPress={() => setNewType('sea')}
                  activeOpacity={0.8}
                >
                  <Ship size={16} color={newType === 'sea' ? '#0D0D0D' : '#9CA3AF'} strokeWidth={2} />
                  <Text style={[s.typeBtnText, newType === 'sea' && s.typeBtnTextActive]}>Bateau</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.formLabel}>Date de départ (AAAA-MM-JJ)</Text>
              <TextInput
                style={s.formInput}
                value={newDate}
                onChangeText={setNewDate}
                placeholder="2025-07-15"
                placeholderTextColor="#5B6470"
              />

              <Text style={s.formLabel}>Capacité totale (lbs) *</Text>
              <TextInput
                style={s.formInput}
                value={newCapacity}
                onChangeText={setNewCapacity}
                placeholder={newType === 'air' ? '500' : '8000'}
                placeholderTextColor="#5B6470"
                keyboardType="decimal-pad"
              />

              <Text style={s.formLabel}>Destinations (séparées par virgule)</Text>
              <TextInput
                style={s.formInput}
                value={newDestinations}
                onChangeText={setNewDestinations}
                placeholder="Port-au-Prince, Cap-Haïtien"
                placeholderTextColor="#5B6470"
              />

              <Text style={s.formLabel}>Notes internes</Text>
              <TextInput
                style={[s.formInput, { height: 70, textAlignVertical: 'top' }]}
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="Notes optionnelles..."
                placeholderTextColor="#5B6470"
                multiline
              />

              <TouchableOpacity
                style={[s.createBtn, creating && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.7}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#0D0D0D" />
                ) : (
                  <Text style={s.createBtnText}>Créer le départ</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
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
    backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#1F1F1F',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10,
  },
  modeIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cardDate: { fontSize: 11, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 10, fontWeight: '700' },
  almostFullBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(245,158,11,0.14)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
  },
  almostFullText: { fontSize: 9, fontWeight: '700', color: '#F59E0B' },

  destRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginBottom: 10,
  },
  destText: { fontSize: 12, color: '#9CA3AF' },

  capacityBlock: {
    marginHorizontal: 16, marginBottom: 10, padding: 12,
    backgroundColor: '#222222', borderRadius: 10,
  },
  capLabel: { fontSize: 12, color: '#9CA3AF' },
  capValue: { fontSize: 12, fontWeight: '700' },
  capInput: {
    width: 80, height: 28, backgroundColor: '#0D0D0D', borderRadius: 6,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 8, fontSize: 12, textAlign: 'center',
  },
  progressBg: { height: 8, borderRadius: 99, backgroundColor: '#333333' },
  progressFill: { height: 8, borderRadius: 99 },
  capStat: { fontSize: 10, color: '#6B7280' },

  pkgCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginBottom: 8,
  },
  pkgCountText: { fontSize: 12, color: '#9CA3AF' },
  notesText: { fontSize: 11, color: '#6B7280', paddingHorizontal: 16, marginBottom: 8 },

  actionsBlock: {
    flexDirection: 'row', gap: 8, padding: 16, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#222222',
  },
  departBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: ACCENT,
  },
  departBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  closeBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  formLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: -6 },
  formInput: {
    height: 44, backgroundColor: '#0D0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 14, fontSize: 13,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 44, borderRadius: 10, backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  typeBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  typeBtnTextActive: { color: '#0D0D0D' },

  createBtn: {
    height: 48, borderRadius: 12, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 20,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },
});
