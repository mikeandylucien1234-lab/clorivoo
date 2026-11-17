import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Dimensions, RefreshControl, Platform, StatusBar,
  Modal, TextInput, KeyboardAvoidingView, Image, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Search, Package, ShoppingCart, Calculator, MapPinned, MapPin, ChevronDown, ChevronRight, Plane, Ship, Calendar, Check, ArrowRight, HelpCircle, Truck, Globe, Gift } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { getMyPackages } from '@jjsimex/supabase/packages';
import { getExchangeRates, subscribeToExchangeRates } from '@jjsimex/supabase/shipping';
import { getNextDepartures, subscribeToDepartures } from '@jjsimex/supabase/departures';
import { getActiveBranches, isBranchOpen, getClosingTime, subscribeToBranches } from '@jjsimex/supabase/branches';
import type { ExchangeRate } from '@jjsimex/supabase/shipping';
import type { Departure } from '@jjsimex/supabase/departures';
import type { Branch } from '@jjsimex/supabase/branches';

const { width } = Dimensions.get('window');

const BANNER_W = width - 40;
const BANNER_GAP = 12;
const BANNERS = [
  require('../../assets/images/banner/banner1.png'),
  require('../../assets/images/banner/banner2.png'),
  require('../../assets/images/banner/banner3.png'),
];

const STATUS_STEPS = ['awaiting_arrival', 'received_usa', 'in_transit', 'arrived', 'ready_pickup', 'delivered'];

const LOYALTY_LABELS: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
};

type Pkg = any;

export default function HomeScreen() {
  const router = useRouter();
  const { session, profile, updateDestination } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { awaiting_arrival: t('status_awaiting'), received_usa: t('status_received'), in_transit: t('status_transit'), arrived: t('status_arrived'), ready_pickup: t('status_ready'), delivered: t('status_delivered') };
    return map[s] ?? s;
  };

  const [refreshing, setRefreshing] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [activePackage, setActivePackage] = useState<Pkg>(null);
  const [recentPackages, setRecentPackages] = useState<Pkg[]>([]);
  const [rates, setRates] = useState<ExchangeRate | null>(null);
  const [airDeparture, setAirDeparture] = useState<Departure | null>(null);
  const [seaDeparture, setSeaDeparture] = useState<Departure | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [bannerDot, setBannerDot] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);

  const CITY_SECTIONS = [
    { flag: '\u{1F1ED}\u{1F1F9}', country: 'haiti', title: 'Haïti', cities: ['Port-au-Prince', 'Cap-Haïtien', 'Pétion-Ville', 'Les Cayes', 'Gonaïves', 'Jacmel'] },
    { flag: '\u{1F1E9}\u{1F1F4}', country: 'dr', title: 'Rép. Dom.', cities: ['Santo Domingo', 'Santiago', 'Punta Cana'] },
  ];

  async function loadData() {
    if (!session?.user.id) return;
    try {
      const result = await getMyPackages(session.user.id, { page: 1 });
      const pkgs: Pkg[] = Array.isArray(result) ? result : result.data ?? [];
      const active = pkgs.find((p: Pkg) => ['awaiting_arrival', 'in_transit', 'arrived', 'ready_pickup', 'received_usa'].includes(p.status));
      setActivePackage(active ?? null);
      setRecentPackages(pkgs.slice(0, 3));
    } catch {}
    try {
      const { air, sea } = await getNextDepartures();
      setAirDeparture(air);
      setSeaDeparture(sea);
    } catch {}
    try {
      const b = await getActiveBranches();
      setBranches(b);
    } catch {}
    try {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    } catch {}
    try {
      const { data } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', session.user.id)
        .single();
      setPointsBalance((data as any)?.points_balance ?? 0);
    } catch {}
    try {
      const { count } = await supabase
        .from('user_vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_used', false);
      setVoucherCount(count ?? 0);
    } catch {}
  }

  useEffect(() => {
    getExchangeRates().then(setRates).catch(() => {});
    const unsub = subscribeToExchangeRates(setRates);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToDepartures(() => {
      getNextDepartures().then(({ air, sea }) => {
        setAirDeparture(air);
        setSeaDeparture(sea);
      }).catch(() => {});
    });
    return unsub;
  }, []);

  useEffect(() => { loadData(); }, [session?.user.id]);

  useEffect(() => {
    const unsub = subscribeToBranches(() => {
      getActiveBranches().then(setBranches).catch(() => {});
    });
    return unsub;
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function pickCity(country: string, city: string) {
    await updateDestination(country, city);
    setCitySheetOpen(false);
    setCitySearch('');
  }

  const nameParts = profile?.full_name?.split(' ') ?? [];
  const firstName = nameParts[0] ?? 'vous';
  const initials = nameParts.length >= 2 ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase() : (nameParts[0]?.[0]?.toUpperCase() ?? '?');
  const loyalty = profile?.loyalty_level ?? 'bronze';
  const stepIdx = activePackage ? STATUS_STEPS.indexOf(activePackage.status) : -1;
  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

  const ACCENT = colors.accent;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 110 : 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* ─── HEADER ─── */}
        <View style={[styles.header, { paddingTop: statusBarH + 12 }]}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs-client)/colis')}
            style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Search size={20} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>Suivre un colis...</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs-client)/notifications')}
            style={[styles.headerIcon, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Bell size={20} color={colors.text} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── PROMO BANNER ─── */}
        <View style={{ marginTop: 16 }}>
          <FlatList
            data={BANNERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            snapToInterval={BANNER_W + BANNER_GAP}
            decelerationRate="fast"
            onMomentumScrollEnd={e => setBannerDot(Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + BANNER_GAP)))}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <View style={{ width: BANNER_W, height: 160, borderRadius: 20, overflow: 'hidden', marginRight: BANNER_GAP }}>
                <Image source={item} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            )}
          />
          <View style={styles.dots}>
            {BANNERS.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: colors.border }, i === bannerDot && { width: 20, backgroundColor: ACCENT }]} />
            ))}
          </View>
        </View>

        {/* ─── MEMBERSHIP CARD ─── */}
        <View style={{ marginHorizontal: 20, marginTop: 20 }}>
          <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.memberTop}>
              <View style={styles.memberInfo}>
                <View style={[styles.memberBadge, { backgroundColor: colors.accentLight }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: ACCENT }}>
                    {LOYALTY_LABELS[loyalty] ?? 'Bronze'} Member
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.memberStats}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.memberStatValue, { color: colors.text }]}>
                  {pointsBalance >= 1000 ? `${(pointsBalance / 1000).toFixed(1)}K` : pointsBalance}
                </Text>
                <Text style={[styles.memberStatLabel, { color: colors.textSecondary }]}>Points</Text>
              </View>
              <View style={{ width: 1, height: 30, backgroundColor: colors.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.memberStatValue, { color: colors.text }]}>{voucherCount}</Text>
                <Text style={[styles.memberStatLabel, { color: colors.textSecondary }]}>Vouchers</Text>
              </View>
            </View>
            <View style={styles.memberActions}>
              <TouchableOpacity
                onPress={() => router.push('/screens/pickup')}
                style={[styles.memberBtn, { backgroundColor: ACCENT }]}
                activeOpacity={0.85}
              >
                <Truck size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.memberBtnText}>Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/screens/dropoff')}
                style={[styles.memberBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                activeOpacity={0.85}
              >
                <MapPin size={18} color={colors.text} strokeWidth={2} />
                <Text style={[styles.memberBtnText, { color: colors.text }]}>Dropoff</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs-client)/membership')}
              style={[styles.upgradeRow, { backgroundColor: colors.accentLight }]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>
                Niveau supérieur à {pointsBalance + 500} points
              </Text>
              <ChevronRight size={16} color={ACCENT} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SHIPPING SERVICES ─── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Services d'envoi</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs-client)/envoyer')}>
              <Text style={[styles.seeAll, { color: ACCENT }]}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.servicesGrid}>
            {[
              { icon: '📦', label: 'Régulier', route: '/screens/create-shipment' },
              { icon: '📄', label: 'Documents', route: '/screens/create-shipment' },
              { icon: '🏋️', label: '+20kg', route: '/screens/create-shipment' },
              { icon: '📮', label: 'Multi-colis', route: '/screens/create-shipment' },
            ].map((svc, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => router.push(svc.route as any)}
                style={[styles.serviceItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View style={[styles.serviceIcon, { backgroundColor: colors.accentLight }]}>
                  <Text style={{ fontSize: 24 }}>{svc.icon}</Text>
                </View>
                <Text style={[styles.serviceLabel, { color: colors.text }]}>{svc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── ACTIVE PACKAGE TRACKING ─── */}
        {activePackage && (
          <View style={styles.section}>
            <View style={[styles.trackingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.trackingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>Votre colis est en route!</Text>
                  <Text style={[styles.trackingRoute, { color: colors.text }]}>
                    {activePackage.origin ?? 'Miami'} → {activePackage.destination_city ?? profile?.destination_city ?? '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/colis/${activePackage.id}`)}
                  style={[styles.liveTrackBtn, { borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Live Tracking</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.trackingTimeline}>
                {['Reçu', 'Transit', 'Arrivé', 'Livré'].map((label, i) => {
                  const done = i <= stepIdx;
                  return (
                    <React.Fragment key={i}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={[styles.timelineDot, { backgroundColor: done ? ACCENT : colors.border }]}>
                          {done && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <Text style={{ fontSize: 10, marginTop: 4, color: done ? ACCENT : colors.textMuted, fontWeight: done ? '700' : '400' }}>{label}</Text>
                      </View>
                      {i < 3 && <View style={[styles.timelineLine, { backgroundColor: i < stepIdx ? ACCENT : colors.border }]} />}
                    </React.Fragment>
                  );
                })}
              </View>

              <View style={styles.trackingDetails}>
                <View style={styles.trackingDetailRow}>
                  <View style={[styles.trackingDetailIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                    <MapPin size={14} color="#EF4444" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>Expéditeur</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{profile?.full_name ?? 'Vous'}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{activePackage.weight_billed ?? '—'} lbs</Text>
                </View>
                <View style={styles.trackingDetailRow}>
                  <View style={[styles.trackingDetailIcon, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                    <MapPin size={14} color="#22C55E" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>Destinataire</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{activePackage.destination_city ?? '—'}, {activePackage.destination_country ?? 'Haïti'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ─── OTHER FEATURES ─── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Autres services</Text>
            <TouchableOpacity><Text style={[styles.seeAll, { color: ACCENT }]}>Voir tout</Text></TouchableOpacity>
          </View>
          <View style={styles.servicesGrid}>
            {[
              { Icon: ShoppingCart, label: 'Personal\nShopper', route: '/screens/personal-shopper' },
              { Icon: MapPinned, label: 'Adresses\nUS', route: '/screens/adresses-us' },
              { Icon: Globe, label: 'International', route: '/screens/create-shipment' },
              { Icon: Gift, label: 'Échanger\nPoints', route: '/(tabs-client)/membership' },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => router.push(item.route as any)}
                style={[styles.serviceItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View style={[styles.serviceIcon, { backgroundColor: colors.accentLight }]}>
                  <item.Icon size={22} color={ACCENT} strokeWidth={1.8} />
                </View>
                <Text style={[styles.serviceLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── NEXT DEPARTURES ─── */}
        {(() => {
          const formatDep = (dep: Departure | null, fallbackDays: number, fallbackCap: number) => {
            const d = dep ? new Date(dep.departure_date) : new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000);
            const capacity = dep?.capacity_lbs ?? fallbackCap;
            const used = dep?.current_weight ?? 0;
            const remaining = capacity - used;
            const pct = (used / capacity) * 100;
            const urgent = pct > 80;
            const dayName = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
            const monthName = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'][d.getMonth()];
            return { dateStr: `${dayName} ${d.getDate()} ${monthName}`, remaining, pct, urgent };
          };
          const air = formatDep(airDeparture, 7, 500);
          const sea = formatDep(seaDeparture, 14, 8000);

          return (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Prochains départs</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[{ mode: 'air' as const, data: air, Icon: Plane, label: 'Avion' }, { mode: 'sea' as const, data: sea, Icon: Ship, label: 'Bateau' }].map(({ mode, data, Icon, label }) => (
                  <View key={mode} style={[styles.departureCard, { backgroundColor: colors.card, borderColor: data.urgent ? colors.warning : colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon size={16} color={data.urgent ? colors.warning : colors.textSecondary} strokeWidth={2} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{label}</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{data.dateStr}</Text>
                    <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                      <View style={{ width: `${Math.max(Math.min(data.pct, 100), 3)}%`, height: '100%', backgroundColor: data.urgent ? colors.warning : ACCENT, borderRadius: 99 }} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: data.urgent ? colors.warning : ACCENT }}>{data.remaining.toFixed(0)} lbs restantes</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* ─── HELP CENTER ─── */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => router.push('/screens/faq')}
            style={[styles.helpCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <View style={[styles.helpIcon, { backgroundColor: colors.accentLight }]}>
              <HelpCircle size={22} color={ACCENT} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Centre d'aide</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Obtenez de l'aide pour vos questions.</Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* ─── BRANCHES ─── */}
        {branches.length > 0 && (
          <View style={[styles.section, { marginBottom: 20 }]}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nos succursales</Text>
              <TouchableOpacity><Text style={[styles.seeAll, { color: ACCENT }]}>Voir carte</Text></TouchableOpacity>
            </View>
            {branches.slice(0, 2).map((b, i) => {
              const open = isBranchOpen(b);
              const closeTime = getClosingTime(b);
              return (
                <View key={b.id} style={[styles.branchCard, { backgroundColor: colors.card, borderColor: colors.border }, i > 0 && { marginTop: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={[styles.branchIcon, { backgroundColor: colors.accentLight }]}>
                      <MapPin size={18} color={ACCENT} strokeWidth={1.8} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{b.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: open ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.1)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: open ? '#22C55E' : colors.textSecondary }}>{open ? 'Ouvert' : 'Fermé'}</Text>
                        </View>
                        {closeTime && open && <Text style={{ fontSize: 10, color: colors.textMuted }}>Ferme à {closeTime}</Text>}
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (b.latitude && b.longitude) Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`);
                      else if (b.address) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`);
                    }}
                    style={[styles.dirBtn, { backgroundColor: ACCENT }]}
                    activeOpacity={0.8}
                  >
                    <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── FOOTER ─── */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          <Text style={{ fontSize: 11, lineHeight: 16, color: colors.textMuted, textAlign: 'center' }}>
            {t('legal_footer')}
          </Text>
        </View>
      </ScrollView>

      {/* CITY PICKER */}
      <Modal visible={citySheetOpen} transparent animationType="slide" onRequestClose={() => setCitySheetOpen(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setCitySheetOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Choisir ma ville</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Rechercher une ville..."
                  placeholderTextColor={colors.textMuted}
                  value={citySearch}
                  onChangeText={setCitySearch}
                  autoCapitalize="words"
                />
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {CITY_SECTIONS.map(section => {
                    const filtered = section.cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
                    if (filtered.length === 0) return null;
                    return (
                      <View key={section.country} style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>{section.flag} {section.title}</Text>
                        {filtered.map(c => (
                          <TouchableOpacity key={c} onPress={() => pickCity(section.country, c)} style={[styles.cityItem, profile?.destination_city === c && { backgroundColor: colors.accentLight }]} activeOpacity={0.7}>
                            <Text style={[{ fontSize: 15, color: colors.text }, profile?.destination_city === c && { color: ACCENT, fontWeight: '700' }]}>{c}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </ScrollView>
                {citySearch.length > 0 && (
                  <TouchableOpacity onPress={() => pickCity(profile?.destination_country ?? 'haiti', citySearch)} style={[styles.confirmBtn, { backgroundColor: ACCENT }]} activeOpacity={0.85}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Confirmer "{citySearch}"</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10,
  },
  searchBar: {
    flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, borderWidth: 1,
  },
  searchPlaceholder: { fontSize: 14 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  badge: {
    position: 'absolute', top: -4, right: -4, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  memberCard: { borderRadius: 20, padding: 18, borderWidth: 1, overflow: 'hidden' },
  memberTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  memberStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  memberStatValue: { fontSize: 20, fontWeight: '800' },
  memberStatLabel: { fontSize: 12, marginTop: 2 },
  memberActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  memberBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  memberBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  servicesGrid: { flexDirection: 'row', gap: 10 },
  serviceItem: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  serviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  serviceLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  trackingCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  trackingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  trackingRoute: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  liveTrackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  trackingTimeline: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 16 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { flex: 1, height: 2, marginTop: 9, marginHorizontal: 4 },
  trackingDetails: { gap: 4 },
  trackingDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackingDetailIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  departureCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1 },
  helpCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
  helpIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  branchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, borderWidth: 1 },
  branchIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dirBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  sheetInput: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, marginBottom: 16 },
  cityItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  confirmBtn: { borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
