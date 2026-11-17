import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

type FilterType = 'tous' | 'colis' | 'paiement' | 'promo' | 'systeme';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: 'tous', label: 'Tout' },
  { key: 'colis', label: 'Colis' },
  { key: 'paiement', label: 'Paiement' },
  { key: 'promo', label: 'Promos' },
  { key: 'systeme', label: 'Système' },
];

const TYPE_ICON: Record<string, { emoji: string; bg: string }> = {
  package:          { emoji: '📦', bg: '#22C55E' },
  personal_shopper: { emoji: '🛍️', bg: '#A855F7' },
  payment:          { emoji: '💳', bg: '#2563EB' },
  promo:            { emoji: '🏷️', bg: '#22C55E' },
  system:           { emoji: '⚙️', bg: '#6B7280' },
};

const FILTER_TYPES: Record<FilterType, string[]> = {
  tous:     [],
  colis:    ['package', 'personal_shopper'],
  paiement: ['payment'],
  promo:    ['promo'],
  systeme:  ['system'],
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, lang } = useLanguage();

  function fmtTime(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return lang === 'fr' ? `Il y a ${diffMin} min` : `${diffMin} min ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return lang === 'fr' ? `Il y a ${diffH}h` : `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return t('yesterday');
    if (diffD < 7) return lang === 'fr' ? `Il y a ${diffD} jours` : `${diffD} days ago`;
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  }
  const [filter, setFilter] = useState<FilterType>('tous');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    loadNotifications();
    if (!session?.user.id) return;
    const ch = supabase
      .channel(`notifs_${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => loadNotifications())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadNotifications, session?.user.id]);

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  async function markAllRead() {
    if (!session?.user.id) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function handleTap(notif: Notification) {
    await markRead(notif.id);
    if (notif.action_url) {
      if (notif.action_url.startsWith('http')) {
        Linking.openURL(notif.action_url);
      } else {
        router.push(notif.action_url as never);
      }
    }
  }

  const filterTypes = FILTER_TYPES[filter];
  const filtered = notifications.filter(n => !filterTypes.length || filterTypes.includes(n.type));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Group by date
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const grouped: { label: string; items: Notification[] }[] = [];
  const todayItems = filtered.filter(n => new Date(n.created_at).toDateString() === today);
  const yesterdayItems = filtered.filter(n => new Date(n.created_at).toDateString() === yesterday);
  const olderItems = filtered.filter(n => new Date(n.created_at).toDateString() !== today && new Date(n.created_at).toDateString() !== yesterday);

  if (todayItems.length) grouped.push({ label: t('today'), items: todayItems });
  if (yesterdayItems.length) grouped.push({ label: t('yesterday'), items: yesterdayItems });
  if (olderItems.length) grouped.push({ label: t('this_week'), items: olderItems });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[styles.title, { color: colors.text }]}>{t('notifications')}</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markAll}>{t('mark_all_read')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_LABELS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterTab, { backgroundColor: colors.card, borderColor: colors.border }, filter === f.key && styles.filterTabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, { color: colors.textSecondary }, filter === f.key && styles.filterTextActive]}>{f.key === 'tous' ? t('filter_all') : f.key === 'colis' ? t('filter_packages') : f.key === 'paiement' ? t('filter_payment') : f.key === 'promo' ? t('filter_promos') : t('filter_system')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {loading && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t('loading')}</Text>
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 32 }}>🔔</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('no_notifications')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('up_to_date')}</Text>
          </View>
        )}

        {grouped.map(group => (
          <View key={group.label}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.label}</Text>
            {group.items.map(notif => {
              const ico = TYPE_ICON[notif.type] ?? { emoji: '📢', bg: '#9CA3AF' };
              return (
                <TouchableOpacity
                  key={notif.id}
                  onPress={() => handleTap(notif)}
                  activeOpacity={0.85}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, !notif.is_read && styles.cardUnread]}
                >
                  {!notif.is_read && <View style={styles.unreadDot} />}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.iconCircle, { backgroundColor: ico.bg }]}>
                      <Text style={{ fontSize: 18 }}>{ico.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }, notif.is_read && { color: colors.textSecondary }]}>{notif.title}</Text>
                      <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{notif.body}</Text>
                      <Text style={[styles.cardTime, { color: colors.textMuted }]}>{fmtTime(notif.created_at)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  badge: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  markAll: { fontSize: 13, fontWeight: '600', color: '#22C55E' },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 14 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  filterTabActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  filterTextActive: { color: '#FFFFFF' },
  groupLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  card: { position: 'relative', backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1F1F1F' },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#22C55E', borderColor: '#1F1F1F' },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', paddingRight: 16 },
  cardBody: { fontSize: 13, color: '#9CA3AF', lineHeight: 19, marginTop: 4 },
  cardTime: { fontSize: 11, color: '#6B7280', marginTop: 6 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginTop: 22 },
  emptyText: { fontSize: 13, lineHeight: 20, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
});
