import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getPackageStats, getAllPackages, subscribeToPackages } from '@jjsimex/supabase/packages';
import { getNextDepartures } from '@jjsimex/supabase/departures';
import { getActiveBranches } from '@jjsimex/supabase/branches';
import { getClient } from '@jjsimex/supabase/client';
import {
  Package, DollarSign, Users, Clock, Bell, Search,
  Plane, Ship, MapPin, ChevronRight, TrendingUp, AlertTriangle,
  ShoppingCart, CreditCard,
} from 'lucide-react-native';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const PERIODS = [
  { label: "Aujourd'hui", key: 'today' },
  { label: '7 jours', key: 'week' },
  { label: '30 jours', key: 'month' },
  { label: 'Ce mois', key: 'this_month' },
] as const;

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  awaiting_arrival: { bg: 'rgba(34,197,94,0.14)', color: '#22C55E', label: 'En attente' },
  received_usa: { bg: '#2A2A2A', color: '#C9CDD3', label: 'Reçu USA' },
  in_transit: { bg: 'rgba(34,197,94,0.14)', color: '#22C55E', label: 'En transit' },
  arrived: { bg: 'rgba(59,130,246,0.16)', color: '#60A5FA', label: 'Arrivé' },
  ready_pickup: { bg: 'rgba(34,197,94,0.14)', color: '#22C55E', label: 'Prêt' },
  delivered: { bg: 'rgba(34,197,94,0.14)', color: '#22C55E', label: 'Livré ✓' },
};

export default function AdminDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const [period, setPeriod] = useState(2);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>(null);
  const [recentPkgs, setRecentPkgs] = useState<any[]>([]);
  const [departures, setDepartures] = useState<{ air: any; sea: any }>({ air: null, sea: null });
  const [branches, setBranches] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [newClientsCount, setNewClientsCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [shopperAlertCount, setShopperAlertCount] = useState(0);
  const [paymentAlertCount, setPaymentAlertCount] = useState(0);

  const periodMap = ['week', 'week', 'month', 'month'] as const;

  const fetchData = useCallback(async () => {
    try {
      const [statsData, pkgsRes, depsData, branchesData, { count: newClients }] = await Promise.all([
        getPackageStats(periodMap[period]),
        getAllPackages({ limit: 4 }),
        getNextDepartures(),
        getActiveBranches(),
        getClient().from('users').select('*', { count: 'exact', head: true }).eq('role', 'client').gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString()),
      ]);
      setStats(statsData);
      setRecentPkgs(pkgsRes?.packages?.slice(0, 4) ?? []);
      setDepartures(depsData);
      setBranches(branchesData);
      setPendingCount(statsData?.by_status?.awaiting_arrival ?? 0);
      setNewClientsCount(newClients ?? 0);

      const [{ count: unreadCount }, { count: shopperAlerts }, { count: paymentAlerts }] = await Promise.all([
        getClient().from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
        getClient().from('personal_shopper_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        getClient().from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setNotifCount(unreadCount ?? 0);
      setShopperAlertCount(shopperAlerts ?? 0);
      setPaymentAlertCount(paymentAlerts ?? 0);
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsub = subscribeToPackages(() => fetchData());
    return unsub;
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const initials = (profile?.full_name || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const roleLabel = profile?.role === 'super_admin' ? 'SUPER ADMIN' : profile?.role === 'employee' ? 'EMPLOYÉ' : 'ADMIN';

  const formatNum = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
  const formatMoney = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  const air = departures.air;
  const sea = departures.sea;

  return (
    <View style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* 1. HEADER */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={s.headerName}>{profile?.full_name || 'Admin'}</Text>
              <View style={s.roleBadge}>
                <Text style={s.roleText}>{roleLabel}</Text>
              </View>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerBtn} activeOpacity={0.7} onPress={() => router.push('/(tabs-admin)/gestion')}>
              <Bell size={19} color="#FFFFFF" strokeWidth={1.8} />
              {notifCount > 0 && <View style={s.bellBadge}><Text style={s.bellBadgeText}>{notifCount}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} activeOpacity={0.7} onPress={() => router.push('/(tabs-admin)/colis')}>
              <Search size={18} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. PÉRIODE */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
          {PERIODS.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[s.periodBtn, period === i && s.periodBtnActive]}
              onPress={() => setPeriod(i)}
              activeOpacity={0.8}
            >
              <Text style={[s.periodText, period === i && s.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 3. KPI CARDS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 12, paddingTop: 18 }}>
          {/* Colis reçus */}
          <View style={s.kpiCard}>
            <View style={s.kpiIcon}><Package size={18} color={ACCENT} strokeWidth={1.8} /></View>
            <Text style={s.kpiLabel}>Colis reçus</Text>
            <Text style={s.kpiValue}>{formatNum(stats?.total ?? 0)}</Text>
            <View style={s.kpiTrend}>
              <TrendingUp size={12} color="#22C55E" strokeWidth={2.4} />
              <Text style={s.kpiTrendText}>{stats?.count_growth > 0 ? '+' : ''}{stats?.count_growth ?? 0}%</Text>
            </View>
          </View>

          {/* Revenus */}
          <View style={s.kpiCard}>
            <View style={s.kpiIcon}><DollarSign size={18} color={ACCENT} strokeWidth={1.8} /></View>
            <Text style={s.kpiLabel}>Revenus</Text>
            <Text style={s.kpiValue}>{formatMoney(stats?.revenue ?? 0)}</Text>
            <View style={s.kpiTrend}>
              <TrendingUp size={12} color="#22C55E" strokeWidth={2.4} />
              <Text style={s.kpiTrendText}>{stats?.revenue_growth > 0 ? '+' : ''}{stats?.revenue_growth ?? 0}%</Text>
            </View>
          </View>

          {/* Nouveaux clients */}
          <View style={s.kpiCard}>
            <View style={s.kpiIcon}><Users size={18} color={ACCENT} strokeWidth={1.8} /></View>
            <Text style={s.kpiLabel}>Nouveaux clients</Text>
            <Text style={s.kpiValue}>{formatNum(newClientsCount)}</Text>
            <View style={s.kpiTrend}>
              <TrendingUp size={12} color="#22C55E" strokeWidth={2.4} />
              <Text style={s.kpiTrendText}>—</Text>
            </View>
          </View>

          {/* En attente */}
          <View style={s.kpiCard}>
            <View style={[s.kpiIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Clock size={18} color="#EF4444" strokeWidth={1.8} />
            </View>
            <Text style={s.kpiLabel}>En attente</Text>
            <Text style={[s.kpiValue, { color: ACCENT }]}>{pendingCount}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs-admin)/colis')} activeOpacity={0.7}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginTop: 6 }}>Traiter →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* 4. ALERTES */}
        {(() => {
          const airNearFull = air && ((air.used_capacity_lbs ?? air.current_weight ?? 0) / air.capacity_lbs) >= 0.8;
          const totalAlerts = (shopperAlertCount > 0 ? 1 : 0) + (paymentAlertCount > 0 ? 1 : 0) + (airNearFull ? 1 : 0);
          if (totalAlerts === 0) return null;
          return (
            <>
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>Alertes</Text>
                <View style={s.alertCountBadge}><Text style={s.alertCountText}>{totalAlerts}</Text></View>
              </View>
              <View style={{ paddingHorizontal: 22, gap: 10 }}>
                {/* Alerte vol */}
                {airNearFull && (
                  <View style={[s.alertCard, { borderLeftColor: '#EF4444' }]}>
                    <View style={s.alertRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.alertTitle}>Vol presque complet</Text>
                        <Text style={s.alertSub}>{(air.used_capacity_lbs ?? air.current_weight ?? 0)} / {air.capacity_lbs} lbs restantes</Text>
                      </View>
                      <TouchableOpacity style={s.alertBtnOrange} activeOpacity={0.85}>
                        <Text style={s.alertBtnOrangeText}>Gérer →</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: `${Math.min(((air.used_capacity_lbs ?? air.current_weight ?? 0) / air.capacity_lbs) * 100, 100)}%`, backgroundColor: ACCENT }]} />
                    </View>
                  </View>
                )}

                {/* Alerte Personal Shopper */}
                {shopperAlertCount > 0 && (
                  <View style={[s.alertCard, { borderLeftColor: ACCENT }]}>
                    <View style={s.alertRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.alertTitle}>Personal Shopper en attente</Text>
                        <Text style={s.alertSub}>{shopperAlertCount} demande(s) en attente</Text>
                      </View>
                      <TouchableOpacity style={s.alertBtnOrange} activeOpacity={0.85} onPress={() => router.push('/screens/admin-personal-shopper')}>
                        <Text style={s.alertBtnOrangeText}>Traiter →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Alerte paiement */}
                {paymentAlertCount > 0 && (
                  <View style={[s.alertCard, { borderLeftColor: '#EAB308' }]}>
                    <View style={s.alertRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.alertTitle}>Paiement non confirmé</Text>
                        <Text style={s.alertSub}>{paymentAlertCount} paiement(s) à vérifier</Text>
                      </View>
                      <TouchableOpacity style={s.alertBtnGrey} activeOpacity={0.85} onPress={() => router.push('/screens/admin-paiements')}>
                        <Text style={s.alertBtnGreyText}>Vérifier →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </>
          );
        })()}

        {/* 5. DERNIERS COLIS */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Derniers colis</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs-admin)/colis')} activeOpacity={0.7}>
            <Text style={s.seeAll}>Voir tout →</Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 22, gap: 10 }}>
          {recentPkgs.map((pkg: any) => {
            const badge = STATUS_BADGE[pkg.status] ?? STATUS_BADGE.awaiting_arrival;
            return (
              <TouchableOpacity key={pkg.id} style={s.colisCard} activeOpacity={0.7} onPress={() => router.push('/(tabs-admin)/colis')}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.colisId}>{pkg.tracking_number || pkg.request_number || pkg.id?.substring(0, 12)}</Text>
                  <Text style={s.colisClient} numberOfLines={1}>{pkg.client_name ?? '—'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={s.colisMeta}>{pkg.weight ? pkg.weight + ' lbs' : '—'}</Text>
                    <Text style={s.colisMeta}>—</Text>
                    {(pkg.transport_mode ?? pkg.type) === 'air' ? (
                      <Plane size={11} color="#9CA3AF" strokeWidth={1.8} />
                    ) : (
                      <Ship size={11} color="#9CA3AF" strokeWidth={1.8} />
                    )}
                    <Text style={s.colisMeta}>{(pkg.transport_mode ?? pkg.type) === 'air' ? 'Avion' : 'Bateau'}</Text>
                  </View>
                </View>
                <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
                <ChevronRight size={16} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
          {recentPkgs.length === 0 && (
            <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', paddingVertical: 20 }}>Aucun colis pour le moment.</Text>
          )}
        </View>

        {/* 6. PROCHAINS DÉPARTS */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Prochains départs</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs-admin)/gestion')}>
            <Text style={s.seeAll}>Gérer →</Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 22, gap: 12 }}>
          {air && (
            <View style={[s.departCard, { borderTopColor: ACCENT }]}>
              <View style={s.departHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Plane size={17} color={ACCENT} strokeWidth={1.8} />
                  <View>
                    <Text style={s.departTitle}>Vol {air.origin} → {air.destination_country === 'haiti' ? 'Port-au-Prince' : 'Santo Domingo'}</Text>
                    <Text style={s.departDate}>{formatDate(air.departure_date)}</Text>
                  </View>
                </View>
                {renderCapacityBadge(air)}
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFillThick, { width: `${((air.used_capacity_lbs ?? air.current_weight ?? 0) / air.capacity_lbs) * 100}%`, backgroundColor: getCapacityColor(air) }]} />
              </View>
              <Text style={s.capacityText}>{(air.used_capacity_lbs ?? air.current_weight ?? 0).toLocaleString()} / {air.capacity_lbs.toLocaleString()} lbs</Text>
              <TouchableOpacity style={[s.departBtn, { backgroundColor: ACCENT }]} activeOpacity={0.85} onPress={() => router.push('/(tabs-admin)/envoyer')}>
                <Text style={[s.departBtnText, { color: '#0D0D0D' }]}>Ajouter des colis</Text>
              </TouchableOpacity>
            </View>
          )}
          {sea && (
            <View style={[s.departCard, { borderTopColor: '#1F1F1F' }]}>
              <View style={s.departHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Ship size={17} color="#9CA3AF" strokeWidth={1.8} />
                  <View>
                    <Text style={s.departTitle}>Bateau {sea.origin} → {sea.destination_country === 'haiti' ? 'PAP' : 'SD'}</Text>
                    <Text style={s.departDate}>{formatDate(sea.departure_date)}</Text>
                  </View>
                </View>
                {renderCapacityBadge(sea)}
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFillThick, { width: `${((sea.used_capacity_lbs ?? sea.current_weight ?? 0) / sea.capacity_lbs) * 100}%`, backgroundColor: getCapacityColor(sea) }]} />
              </View>
              <Text style={s.capacityText}>{(sea.used_capacity_lbs ?? sea.current_weight ?? 0).toLocaleString()} / {sea.capacity_lbs.toLocaleString()} lbs</Text>
              <TouchableOpacity style={[s.departBtn, { backgroundColor: '#2A2A2A' }]} activeOpacity={0.85} onPress={() => router.push('/(tabs-admin)/envoyer')}>
                <Text style={[s.departBtnText, { color: '#FFFFFF' }]}>Ajouter des colis</Text>
              </TouchableOpacity>
            </View>
          )}
          {!air && !sea && (
            <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', paddingVertical: 20 }}>Aucun départ planifié.</Text>
          )}
        </View>

        {/* 7. SUCCURSALES */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Succursales</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs-admin)/gestion')}>
            <Text style={s.seeAll}>Voir tout →</Text>
          </TouchableOpacity>
        </View>
        {branches.length > 0 && (
          <View style={s.branchesCard}>
            {branches.map((b: any, i: number) => (
              <View key={b.id || i} style={[s.branchRow, i < branches.length - 1 && s.branchBorder]}>
                <MapPin size={15} color={ACCENT} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.branchName} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }} numberOfLines={1}>{b.address || b.city || ''}</Text>
                </View>
                <Text style={s.branchStats}>{b.city || ''}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(d: string) {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  try {
    const dt = new Date(d + 'T12:00:00');
    return `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch { return d; }
}

function getCapacityColor(dep: any) {
  const pct = ((dep.used_capacity_lbs ?? dep.current_weight ?? 0) / (dep.capacity_lbs || 1)) * 100;
  if (pct >= 80) return '#EF4444';
  if (pct >= 50) return '#22C55E';
  return '#22C55E';
}

function renderCapacityBadge(dep: any) {
  const pct = (dep.current_weight / dep.capacity_lbs) * 100;
  if (pct >= 80) {
    return <View style={{ backgroundColor: 'rgba(239,68,68,0.14)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }}><Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>Bientôt complet !</Text></View>;
  }
  return <View style={{ backgroundColor: 'rgba(34,197,94,0.14)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }}><Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E' }}>Places disponibles</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: statusBarH + 10, paddingBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#0D0D0D' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', lineHeight: 18 },
  roleBadge: {
    backgroundColor: ACCENT, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, marginTop: 4, alignSelf: 'flex-start',
  },
  roleText: { fontSize: 10, fontWeight: '700', color: '#0D0D0D', letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    position: 'relative', width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: 6, right: 7,
    minWidth: 15, height: 15, borderRadius: 99,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#0D0D0D',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },

  periodBtn: {
    height: 36, borderRadius: 99, paddingHorizontal: 16,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  periodBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  periodText: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  periodTextActive: { fontWeight: '700', color: '#0D0D0D' },

  kpiCard: {
    width: 160, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, padding: 16,
  },
  kpiIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  kpiLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 12 },
  kpiValue: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8, marginTop: 2 },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  kpiTrendText: { fontSize: 12, fontWeight: '600', color: '#22C55E' },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 22, marginTop: 26, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  seeAll: { fontSize: 13, fontWeight: '600', color: ACCENT },

  alertCountBadge: {
    minWidth: 22, height: 22, borderRadius: 99, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7,
  },
  alertCountText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  alertCard: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderLeftWidth: 3, borderRadius: 16, padding: 14, paddingHorizontal: 16,
  },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  alertSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  alertBtnOrange: {
    backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8,
  },
  alertBtnOrangeText: { fontSize: 12, fontWeight: '700', color: '#0D0D0D' },
  alertBtnGrey: {
    backgroundColor: '#2A2A2A', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8,
  },
  alertBtnGreyText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  progressBg: { height: 5, borderRadius: 99, backgroundColor: '#2A2A2A', overflow: 'hidden', marginTop: 12 },
  progressFill: { height: '100%', borderRadius: 99 },

  colisCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, padding: 14,
  },
  colisId: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  colisClient: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  colisMeta: { fontSize: 11, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  departCard: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderTopWidth: 3, borderRadius: 16, padding: 16,
  },
  departHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  departTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  departDate: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  progressFillThick: { height: '100%', borderRadius: 99 },
  capacityText: { fontSize: 11, color: '#6B7280', marginTop: 7 },
  departBtn: {
    marginTop: 12, width: '100%', height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  departBtnText: { fontSize: 13, fontWeight: '700' },

  branchesCard: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, marginHorizontal: 22, paddingHorizontal: 16, paddingVertical: 6,
  },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  branchBorder: { borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  branchName: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  branchBarBg: { height: 4, borderRadius: 99, backgroundColor: '#2A2A2A', overflow: 'hidden', marginTop: 7 },
  branchBarFill: { height: '100%', borderRadius: 99, backgroundColor: ACCENT },
  branchStats: { fontSize: 11, color: '#9CA3AF', flexShrink: 0 },
});
