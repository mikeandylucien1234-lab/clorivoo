import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getPackageDetail, subscribeToPackages } from '@jjsimex/supabase/packages';
import type { PackageStatus } from '@jjsimex/supabase/packages';

const STATUS_LABELS: Record<PackageStatus, string> = {
  pending: 'En attente',
  received_usa: 'Reçu USA',
  in_transit: 'En transit',
  arrived: 'Arrivé',
  ready_pickup: 'Prêt au retrait',
  delivered: 'Livré',
};

// Ordre des étapes dans la timeline du prototype
const TIMELINE_STEPS: { key: string; label: string; sublabel?: string }[] = [
  { key: 'received_usa', label: 'Reçu à Miami', sublabel: 'Entrepôt Miami, FL' },
  { key: 'in_transit', label: 'En transit', sublabel: 'Vol Miami → Port-au-Prince' },
  { key: 'arrived', label: 'Arrivé en Haïti', sublabel: 'En attente de dédouanement' },
  { key: 'ready_pickup', label: 'Prêt au retrait', sublabel: 'Succursale Delmas 31' },
  { key: 'delivered', label: 'Livré', sublabel: '' },
];

const STATUS_ORDER = ['pending', 'received_usa', 'in_transit', 'arrived', 'ready_pickup', 'delivered'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PkgDetail = any;

export default function ColisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const [pkg, setPkg] = useState<PkgDetail>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.user.id || !id) return;
    const load = () => getPackageDetail(id, session.user.id).then(setPkg).catch(() => {});
    load().catch((e) => setError(e instanceof Error ? e.message : 'Erreur lors du chargement.')).finally(() => setLoading(false));
    const unsub = subscribeToPackages((updated: any) => {
      if (updated.id === id) load();
    });
    return unsub;
  }, [id, session?.user.id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#22C55E" size="large" />
      </View>
    );
  }

  if (error || !pkg) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>
          {error || 'Colis introuvable.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#22C55E' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(pkg.status);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#FFFFFF', fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du colis</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Text style={{ color: '#FFFFFF', fontSize: 18 }}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* SCROLL */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 22, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO ORANGE */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroTrackingLabel}>Numéro de tracking</Text>
              <Text style={styles.heroTracking}>{pkg.tracking_number}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{STATUS_LABELS[pkg.status as PackageStatus] ?? pkg.status}</Text>
            </View>
          </View>

          <View style={styles.heroClientRow}>
            <Text style={styles.heroClientText}>
              {pkg.users ? `${pkg.users.first_name} ${pkg.users.last_name}` : '—'}
            </Text>
          </View>

          <View style={styles.heroRoute}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroRouteLabel}>Départ</Text>
              <Text style={styles.heroRouteVal} numberOfLines={1}>Miami Warehouse</Text>
            </View>
            <Text style={{ color: '#1A0D02', fontWeight: '700', fontSize: 18 }}>→</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.heroRouteLabel}>Destination</Text>
              <Text style={styles.heroRouteVal} numberOfLines={1}>{pkg.destination_city}</Text>
            </View>
          </View>

          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>{pkg.weight_real} lbs</Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroMetaText}>{pkg.transport_mode === 'air' ? 'Avion' : 'Bateau'}</Text>
            <View style={styles.heroDot} />
            {pkg.estimated_delivery && (
              <Text style={styles.heroMetaText}>{new Date(pkg.estimated_delivery).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
            )}
          </View>
        </View>

        {/* STATUT DÉTAILLÉ — timeline verticale */}
        <Text style={styles.sectionTitle}>Statut détaillé</Text>
        <View>
          {TIMELINE_STEPS.map((step, i) => {
            const stepIndex = STATUS_ORDER.indexOf(step.key);
            const done = stepIndex <= currentIndex;
            const isCurrent = step.key === pkg.status;
            const isLast = i === TIMELINE_STEPS.length - 1;

            // Chercher dans l'historique
            const histEntry = pkg.package_status_history?.find((h: { status: string; created_at: string }) => h.status === step.key);

            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    done && styles.timelineDotDone,
                    isCurrent && styles.timelineDotCurrent,
                    !done && styles.timelineDotPending,
                  ]}>
                    {done && <Text style={{ color: '#0D0D0D', fontSize: 9, fontWeight: '900' }}>✓</Text>}
                  </View>
                  {!isLast && (
                    <View style={[styles.timelineLine, { backgroundColor: done && !isCurrent ? '#22C55E' : '#2E2E2E' }]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, !done && styles.timelineLabelPending]}>{step.label}</Text>
                  {step.sublabel ? (
                    <Text style={[styles.timelineSub, !done && styles.timelineSubPending]}>{step.sublabel}</Text>
                  ) : null}
                  {histEntry && (
                    <Text style={styles.timelineDate}>{new Date(histEntry.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* INFORMATIONS COLIS */}
        <Text style={styles.sectionTitle}>Informations colis</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Poids réel</Text>
            <Text style={styles.infoValue}>{pkg.weight_real} lbs</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Poids facturé</Text>
            <Text style={styles.infoValue}>{pkg.weight_billed?.toFixed(2)} lbs</Text>
          </View>
          {pkg.length_in && pkg.width_in && pkg.height_in ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Dimensions</Text>
              <Text style={styles.infoValue}>{pkg.length_in} × {pkg.width_in} × {pkg.height_in} in</Text>
            </View>
          ) : null}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Valeur déclarée</Text>
            <Text style={styles.infoValue}>${pkg.declared_value?.toFixed(2)}</Text>
          </View>
        </View>

        {/* ASSURANCE */}
        <Text style={styles.sectionTitle}>Assurance</Text>
        <View style={styles.insuranceCard}>
          <View style={styles.insuranceRow}>
            <View style={styles.insuranceLeft}>
              <View style={styles.insuranceIcon}><Text style={{ fontSize: 20 }}>🛡️</Text></View>
              <Text style={styles.insuranceTitleText}>Colis assuré jusqu'à $100</Text>
            </View>
            <View style={styles.insuranceBadge}><Text style={styles.insuranceBadgeText}>Couverture active</Text></View>
          </View>
          <TouchableOpacity style={styles.insuranceBtn}>
            <Text style={styles.insuranceBtnText}>Augmenter ma couverture</Text>
          </TouchableOpacity>
        </View>

        {/* CTA WhatsApp */}
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={() => Linking.openURL('https://wa.me/13056009364')}
          activeOpacity={0.9}
        >
          <Text style={{ fontSize: 20 }}>💬</Text>
          <Text style={styles.whatsappBtnText}>Contacter via WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Signaler un problème</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(tabs-client)/home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(tabs-client)/colis')}>
          <Text style={{ fontSize: 22 }}>📦</Text>
          <Text style={[styles.navLabel, { color: '#22C55E' }]}>Mes colis</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtnCenter}>
          <View style={styles.navFAB}><Text style={{ fontSize: 22 }}>⬛</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(tabs-client)/colis')}>
          <Text style={styles.navIcon}>🔔</Text>
          <Text style={styles.navLabel}>Notifs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(tabs-client)/profil')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  centered: { flex: 1, backgroundColor: '#0D0D0D', justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  header: {
    height: 60, backgroundColor: '#0D0D0D', borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontWeight: '700', fontSize: 16, color: '#FFFFFF' },

  scroll: { flex: 1 },

  // Hero
  hero: { backgroundColor: '#22C55E', borderRadius: 16, padding: 20, marginBottom: 28 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroTrackingLabel: { fontSize: 12, fontWeight: '500', color: 'rgba(26,13,2,0.6)' },
  heroTracking: { fontWeight: '800', fontSize: 20, letterSpacing: -0.3, marginTop: 2, color: '#1A0D02' },
  statusBadge: { backgroundColor: '#C2600A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  heroClientRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  heroClientText: { fontSize: 13, fontWeight: '600', color: '#1A0D02' },
  heroRoute: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    padding: 12, backgroundColor: 'rgba(26,13,2,0.10)', borderRadius: 12,
  },
  heroRouteLabel: { fontSize: 11, color: 'rgba(26,13,2,0.55)' },
  heroRouteVal: { fontSize: 13, fontWeight: '600', color: '#1A0D02' },
  heroMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(26,13,2,0.15)',
  },
  heroMetaText: { fontSize: 13, fontWeight: '600', color: '#1A0D02' },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(26,13,2,0.4)' },

  // Section title
  sectionTitle: { fontWeight: '700', fontSize: 18, color: '#FFFFFF', marginBottom: 16, marginTop: 4 },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 18 },
  timelineDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  timelineDotDone: { backgroundColor: '#22C55E' },
  timelineDotCurrent: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 6,
  },
  timelineDotPending: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#3A3A3A' },
  timelineLine: { flex: 1, width: 2, minHeight: 20 },
  timelineContent: { flex: 1, paddingBottom: 26 },
  timelineLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  timelineLabelPending: { color: '#6B7280' },
  timelineSub: { fontSize: 13, color: '#9CA3AF', marginTop: 3 },
  timelineSubPending: { color: '#6B7280' },
  timelineDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 },
  infoCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#1A1A1A', borderWidth: 1,
    borderColor: '#1F1F1F', borderRadius: 16, padding: 16,
  },
  infoLabel: { fontSize: 12, color: '#9CA3AF' },
  infoValue: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginTop: 6 },

  // Insurance
  insuranceCard: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, padding: 18, marginBottom: 26,
  },
  insuranceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insuranceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insuranceIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  insuranceTitleText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  insuranceBadge: { backgroundColor: 'rgba(34,197,94,0.14)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  insuranceBadgeText: { color: '#22C55E', fontSize: 11, fontWeight: '600' },
  insuranceBtn: {
    marginTop: 16, width: '100%', height: 44, backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  insuranceBtnText: { color: '#22C55E', fontWeight: '600', fontSize: 14 },

  // WhatsApp CTA
  whatsappBtn: {
    width: '100%', height: 54, borderRadius: 14, backgroundColor: '#22C55E',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  whatsappBtnText: { color: '#0D0D0D', fontWeight: '700', fontSize: 16 },

  // Bottom nav
  bottomNav: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 84,
    backgroundColor: '#111111', borderTopWidth: 1, borderTopColor: '#2A2A2A',
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around',
    paddingTop: 12,
  },
  navBtn: { width: 56, alignItems: 'center', gap: 5 },
  navBtnCenter: { width: 56, alignItems: 'center' },
  navFAB: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginTop: -22,
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 18, borderWidth: 4, borderColor: '#111111',
  },
  navIcon: { fontSize: 22, color: '#666666' },
  navLabel: { fontSize: 10, fontWeight: '600', color: '#666666' },
});
