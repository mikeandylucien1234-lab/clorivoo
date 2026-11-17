import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, TextInput, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/layout/BackButton';
import { scanPackage, updatePackageStatus, type PackageStatus } from '@jjsimex/supabase/packages';
import { supabase } from '@/lib/supabase';
import {
  Search, Zap, CheckCircle, MessageCircle,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { QRPayload } from '@/components/ui/QRCodeDisplay';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';
const WA_NUMBER = '18097851234';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  awaiting_arrival: { label: 'En attente', bg: 'rgba(239,68,68,0.14)', color: '#EF4444' },
  received_usa: { label: 'Reçu USA', bg: '#2A2A2A', color: '#C9CDD3' },
  in_transit: { label: 'En transit', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  arrived: { label: 'Arrivé Haïti', bg: 'rgba(234,179,8,0.14)', color: '#EAB308' },
  ready_pickup: { label: 'Prêt retrait', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
  delivered: { label: 'Livré ✓', bg: 'rgba(34,197,94,0.14)', color: '#22C55E' },
};

const STATUS_KEYS: PackageStatus[] = ['received_usa', 'in_transit', 'arrived', 'ready_pickup'];

export default function AdminScanner() {
  const router = useRouter();
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState('');
  const [updated, setUpdated] = useState(false);
  const [recentScans, setRecentScans] = useState<{ id: string; status: string; time: string }[]>([]);
  const [flash, setFlash] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [scanLock, setScanLock] = useState(false);

  function parseQR(data: string): QRPayload | null {
    try {
      const parsed = JSON.parse(data);
      if (parsed.app === 'jjsimex' && parsed.ref) return parsed as QRPayload;
    } catch {}
    return null;
  }

  async function lookupByRef(ref: string) {
    setLoading(true);
    setPkg(null);
    setUpdated(false);
    try {
      const result = await scanPackage(ref);
      setPkg(result);
      setCurrentStatus(result.status);
      setCameraActive(false);
    } catch (e: any) {
      Alert.alert('Introuvable', `Aucun colis trouvé pour "${ref}"`);
    }
    setLoading(false);
  }

  function handleBarCodeScanned(result: { data: string }) {
    if (scanLock || !cameraActive) return;
    setScanLock(true);

    const qr = parseQR(result.data);
    if (qr) {
      lookupByRef(qr.ref);
    } else {
      lookupByRef(result.data);
    }

    setTimeout(() => setScanLock(false), 2000);
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    lookupByRef(q);
  }

  async function handleChangeStatus(newStatus: PackageStatus) {
    if (!pkg || !session?.user?.id) return;
    try {
      const label = STATUS_MAP[newStatus]?.label ?? newStatus;
      await updatePackageStatus(pkg.id, newStatus, `Statut changé via scanner vers ${label}`, session.user.id, supabase);
      setCurrentStatus(newStatus);
      setUpdated(true);
      setRecentScans(prev => [
        { id: pkg.tracking_number, status: newStatus, time: 'à l\'instant' },
        ...prev.slice(0, 9),
      ]);
      setTimeout(() => setUpdated(false), 3000);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }

  function notifyWhatsApp() {
    if (!pkg) return;
    const u = Array.isArray(pkg.users) ? pkg.users[0] : pkg.users;
    const phone = u?.phone_whatsapp || WA_NUMBER;
    const label = STATUS_MAP[currentStatus]?.label ?? currentStatus;
    const msg = encodeURIComponent(
      `Bonjour${u?.full_name ? ' ' + u.full_name : ''},\n\nVotre colis ${pkg.tracking_number} a été mis à jour :\n📦 Statut : ${label}\n\nMerci de votre confiance !\nJJ's IMEX`
    );
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`);
  }

  function clientName() {
    if (!pkg) return '—';
    const u = Array.isArray(pkg.users) ? pkg.users[0] : pkg.users;
    return u?.full_name ?? '—';
  }

  function resetScan() {
    setPkg(null);
    setQuery('');
    setUpdated(false);
    setCameraActive(true);
  }

  const badge = STATUS_MAP[currentStatus] ?? STATUS_MAP.awaiting_arrival;
  const cameraGranted = permission?.granted;

  return (
    <View style={s.container}>
      {/* HEADER */}
      <View style={s.header}>
        <BackButton />
        <Text style={s.headerTitle}>Scanner un colis</Text>
        <TouchableOpacity
          style={[s.flashBtn, flash && s.flashBtnActive]}
          onPress={() => setFlash(!flash)}
          activeOpacity={0.7}
        >
          <Zap size={18} color={flash ? '#0D0D0D' : '#FFFFFF'} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ZONE CAMÉRA */}
        {cameraActive && (
          <View style={s.cameraZone}>
            {cameraGranted ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarCodeScanned}
                enableTorch={flash}
              />
            ) : (
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={requestPermission} activeOpacity={0.9}>
                <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 }}>
                  Appuyez pour autoriser la caméra
                </Text>
              </TouchableOpacity>
            )}
            {/* Scan frame overlay */}
            <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
              <View style={s.scanFrame}>
                <View style={[s.corner, s.cornerTL]} />
                <View style={[s.corner, s.cornerTR]} />
                <View style={[s.corner, s.cornerBL]} />
                <View style={[s.corner, s.cornerBR]} />
                <View style={s.scanLine} />
              </View>
            </View>
            <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
              <Text style={s.cameraHint}>Placez le QR code dans le cadre</Text>
            </View>
          </View>
        )}

        {/* Bouton réactiver caméra si résultat affiché */}
        {!cameraActive && pkg && (
          <TouchableOpacity style={s.newScanBtn} onPress={resetScan} activeOpacity={0.85}>
            <Text style={s.newScanBtnText}>Scanner un autre colis</Text>
          </TouchableOpacity>
        )}

        {/* SÉPARATEUR */}
        <View style={s.separatorRow}>
          <View style={s.separatorLine} />
          <Text style={s.separatorText}>ou entrer manuellement</Text>
          <View style={s.separatorLine} />
        </View>

        {/* SAISIE MANUELLE */}
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="JJI-2025-00847"
            placeholderTextColor="#5B6470"
            autoCapitalize="characters"
            onSubmitEditing={handleSearch}
          />
          <Search size={18} color={ACCENT} strokeWidth={2} style={{ position: 'absolute', right: 14, top: 16 }} />
        </View>
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.85} disabled={loading}>
          {loading ? <ActivityIndicator color="#0D0D0D" /> : <Text style={s.searchBtnText}>Rechercher ce colis</Text>}
        </TouchableOpacity>

        {/* RÉSULTAT */}
        {pkg && (
          <View style={s.resultCard}>
            <View style={s.resultBanner}>
              <CheckCircle size={20} color="#1A0D02" strokeWidth={2.4} />
              <View>
                <Text style={s.resultBannerSub}>Colis trouvé !</Text>
                <Text style={s.resultBannerTitle}>{pkg.tracking_number}</Text>
              </View>
            </View>

            <View style={s.resultBody}>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Client</Text>
                <Text style={s.detailValue}>{clientName()}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Destination</Text>
                <Text style={s.detailValue}>{pkg.destination_city ?? '—'}, {pkg.destination_country === 'haiti' ? 'Haïti' : 'Rép. Dom.'}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Poids — Mode</Text>
                <Text style={s.detailValue}>{pkg.weight_billed ?? pkg.weight_real ?? '—'} lbs — {pkg.transport_mode === 'air' ? 'Avion' : 'Bateau'}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Statut actuel</Text>
                <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              <Text style={s.statusSectionTitle}>Mettre à jour le statut</Text>
              <View style={s.statusGrid}>
                {STATUS_KEYS.map((key) => {
                  const isActive = currentStatus === key;
                  const info = STATUS_MAP[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[s.statusBtn, isActive && s.statusBtnActive]}
                      onPress={() => handleChangeStatus(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.statusBtnText, isActive && s.statusBtnTextActive]}>{info.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[s.deliveredBtn, currentStatus === 'delivered' && s.deliveredBtnActive]}
                onPress={() => handleChangeStatus('delivered')}
                activeOpacity={0.8}
              >
                <Text style={[s.deliveredBtnText, currentStatus === 'delivered' && s.deliveredBtnTextActive]}>Livré ✓</Text>
              </TouchableOpacity>

              {updated && (
                <View style={s.updatedBanner}>
                  <CheckCircle size={13} color="#22C55E" strokeWidth={2.5} />
                  <Text style={s.updatedText}>Statut mis à jour : {badge.label}</Text>
                </View>
              )}

              <TouchableOpacity style={s.waBtn} onPress={notifyWhatsApp} activeOpacity={0.85}>
                <MessageCircle size={18} color="#052E14" strokeWidth={1.8} />
                <Text style={s.waBtnText}>Notifier le client WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SCANS RÉCENTS */}
        {recentScans.length > 0 && (
          <>
            <Text style={s.recentTitle}>Scans récents</Text>
            <View style={{ gap: 10 }}>
              {recentScans.map((scan, i) => {
                const b = STATUS_MAP[scan.status] ?? STATUS_MAP.in_transit;
                return (
                  <View key={i} style={s.recentCard}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.recentId}>{scan.id}</Text>
                      <Text style={s.recentSub}>Statut mis à jour — {scan.time}</Text>
                    </View>
                    <View style={[s.recentBadge, { backgroundColor: b.bg }]}>
                      <Text style={[s.recentBadgeText, { color: b.color }]}>{b.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: statusBarH + 10, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  flashBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  flashBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },

  cameraZone: {
    height: 300, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A',
  },
  scanFrame: { width: 200, height: 200, position: 'relative' },
  corner: { position: 'absolute', width: 36, height: 36 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderColor: ACCENT, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderColor: ACCENT, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: ACCENT, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderColor: ACCENT, borderBottomRightRadius: 14 },
  scanLine: {
    position: 'absolute', left: 10, right: 10, top: '45%',
    height: 2, backgroundColor: ACCENT, borderRadius: 1,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 12,
  },
  cameraHint: { fontSize: 13, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },

  newScanBtn: {
    height: 50, borderRadius: 14, backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  newScanBtnText: { fontSize: 14, fontWeight: '700', color: ACCENT },

  separatorRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#2A2A2A' },
  separatorText: { fontSize: 12, color: '#6B7280' },

  inputWrap: { position: 'relative' },
  input: {
    width: '100%', height: 50, backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12,
    color: '#FFFFFF', paddingHorizontal: 16, paddingRight: 46, fontSize: 15,
  },
  searchBtn: {
    marginTop: 12, width: '100%', height: 50,
    backgroundColor: ACCENT, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { fontSize: 15, fontWeight: '700', color: '#0D0D0D' },

  resultCard: { marginTop: 22, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2A2A2A' },
  resultBanner: {
    backgroundColor: ACCENT, padding: 14, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  resultBannerSub: { fontSize: 12, fontWeight: '600', color: 'rgba(26,13,2,0.65)' },
  resultBannerTitle: { fontSize: 17, fontWeight: '800', color: '#1A0D02' },

  resultBody: { backgroundColor: '#1A1A1A', padding: 18 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  detailLabel: { fontSize: 13, color: '#9CA3AF' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  statusSectionTitle: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginTop: 18, marginBottom: 10 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusBtn: {
    width: '47%', height: 42, borderRadius: 10,
    backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  statusBtnActive: { backgroundColor: 'rgba(34,197,94,0.14)', borderColor: ACCENT },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#C9CDD3' },
  statusBtnTextActive: { fontWeight: '700', color: ACCENT },

  deliveredBtn: {
    marginTop: 10, width: '100%', height: 44, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.14)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  deliveredBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  deliveredBtnText: { fontSize: 13, fontWeight: '700', color: '#22C55E' },
  deliveredBtnTextActive: { color: '#052E14' },

  updatedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: 'rgba(34,197,94,0.10)', borderRadius: 10, padding: 10, paddingHorizontal: 14,
  },
  updatedText: { fontSize: 12, fontWeight: '600', color: '#22C55E' },

  waBtn: {
    marginTop: 14, width: '100%', height: 48,
    backgroundColor: '#22C55E', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  waBtnText: { fontSize: 14, fontWeight: '700', color: '#052E14' },

  recentTitle: { fontWeight: '700', fontSize: 17, color: '#FFFFFF', marginTop: 26, marginBottom: 12 },
  recentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, padding: 14,
  },
  recentId: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  recentSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  recentBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  recentBadgeText: { fontSize: 10, fontWeight: '700' },
});
