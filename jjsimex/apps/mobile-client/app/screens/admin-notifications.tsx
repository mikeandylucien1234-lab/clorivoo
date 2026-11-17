import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Bell, Send, Globe, MapPin, CheckCheck,
  Package, CreditCard, ShoppingCart, Settings, X, Megaphone,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { sendBulkNotification } from '@jjsimex/supabase/push';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  package: { label: 'Colis', bg: 'rgba(59,130,246,0.14)', color: '#3B82F6', icon: Package },
  payment: { label: 'Paiement', bg: 'rgba(34,197,94,0.14)', color: '#22C55E', icon: CreditCard },
  personal_shopper: { label: 'Shopper', bg: 'rgba(168,85,247,0.14)', color: '#A855F7', icon: ShoppingCart },
  system: { label: 'Système', bg: 'rgba(34,197,94,0.14)', color: ACCENT, icon: Settings },
  promo: { label: 'Promo', bg: 'rgba(236,72,153,0.14)', color: '#EC4899', icon: Megaphone },
};

function groupByDate(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const urgent: Notification[] = [];
  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const weekItems: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifs) {
    const d = new Date(n.created_at);
    if (!n.is_read && (now.getTime() - d.getTime()) < 2 * 60 * 60 * 1000) {
      urgent.push(n);
    } else if (d >= today) {
      todayItems.push(n);
    } else if (d >= yesterday) {
      yesterdayItems.push(n);
    } else if (d >= weekAgo) {
      weekItems.push(n);
    } else {
      older.push(n);
    }
  }

  const groups: { label: string; items: Notification[] }[] = [];
  if (urgent.length) groups.push({ label: '🔴 Urgent', items: urgent });
  if (todayItems.length) groups.push({ label: "Aujourd'hui", items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Hier', items: yesterdayItems });
  if (weekItems.length) groups.push({ label: 'Cette semaine', items: weekItems });
  if (older.length) groups.push({ label: 'Plus ancien', items: older });
  return groups;
}

export default function AdminNotifications() {
  const router = useRouter();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSend, setShowSend] = useState(false);

  // Send form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'haiti' | 'dr'>('all');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'history'>('inbox');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setNotifications((data ?? []) as Notification[]);
    } catch {}
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs(data ?? []);
    } catch {}
    setLogsLoading(false);
  }, []);

  useEffect(() => { if (tab === 'history') fetchLogs(); }, [tab, fetchLogs]);

  useEffect(() => {
    const channel = supabase
      .channel('notifs_admin_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile!.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, profile]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }

  async function handleMarkAllRead() {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile!.id).eq('is_read', false);
      fetchNotifications();
    } catch {}
  }

  async function handleTapNotif(n: Notification) {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
  }

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Erreur', 'Titre et message requis.');
      return;
    }

    Alert.alert(
      'Envoyer la notification',
      `Envoyer à ${target === 'all' ? 'tous les clients' : target === 'haiti' ? 'clients Haïti' : 'clients Rép. Dom.'} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Envoyer', onPress: async () => {
            setSending(true);
            try {
              let userQuery = supabase.from('users').select('id').eq('role', 'client');
              if (target === 'haiti') userQuery = userQuery.eq('destination_country', 'haiti');
              else if (target === 'dr') userQuery = userQuery.eq('destination_country', 'dr');

              const { data: users } = await userQuery;
              if (users && users.length > 0) {
                await supabase.from('notifications').insert(
                  users.map((u: any) => ({
                    user_id: u.id,
                    type: 'promo',
                    title: title.trim(),
                    message: message.trim(),
                  }))
                );
              }

              const pushResult = await sendBulkNotification(title.trim(), message.trim(), target);

              await supabase.from('notification_logs').insert({
                sent_by: profile!.id,
                title: title.trim(),
                message: message.trim(),
                target_type: target,
                recipient_count: users?.length ?? 0,
                sent_count: pushResult.sent,
                failed_count: pushResult.failed,
              });

              Alert.alert('Envoyé !', `Notification envoyée à ${users?.length ?? 0} clients.`);
              setTitle('');
              setMessage('');
              setShowSend(false);
              if (tab === 'history') fetchLogs();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
            setSending(false);
          },
        },
      ]
    );
  }

  const groups = groupByDate(notifications);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={s.headerBadge}><Text style={s.headerBadgeText}>{unreadCount}</Text></View>
        )}
        <TouchableOpacity style={s.sendToggle} onPress={() => setShowSend(true)} activeOpacity={0.7}>
          <Send size={16} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', marginHorizontal: 18, marginTop: 10, gap: 8 }}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'inbox' && s.tabBtnActive]}
          onPress={() => setTab('inbox')} activeOpacity={0.8}
        >
          <Bell size={14} color={tab === 'inbox' ? '#0D0D0D' : '#9CA3AF'} strokeWidth={2} />
          <Text style={[s.tabBtnText, tab === 'inbox' && s.tabBtnTextActive]}>Boîte de réception</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'history' && s.tabBtnActive]}
          onPress={() => setTab('history')} activeOpacity={0.8}
        >
          <Megaphone size={14} color={tab === 'history' ? '#0D0D0D' : '#9CA3AF'} strokeWidth={2} />
          <Text style={[s.tabBtnText, tab === 'history' && s.tabBtnTextActive]}>Historique envois</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={tab === 'history' ? fetchLogs : onRefresh} tintColor={ACCENT} />}
      >
        {tab === 'inbox' ? (
          <>
            {unreadCount > 0 && (
              <TouchableOpacity style={s.markAllBtn} onPress={handleMarkAllRead} activeOpacity={0.7}>
                <CheckCheck size={14} color={ACCENT} strokeWidth={2} />
                <Text style={s.markAllText}>Tout marquer comme lu ({unreadCount})</Text>
              </TouchableOpacity>
            )}

            {loading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
            ) : notifications.length === 0 ? (
              <Text style={s.emptyText}>Aucune notification.</Text>
            ) : (
              <View style={{ paddingHorizontal: 18 }}>
                {groups.map((group) => (
                  <View key={group.label} style={{ marginBottom: 16 }}>
                    <Text style={s.groupLabel}>{group.label}</Text>
                    <View style={{ gap: 6 }}>
                      {group.items.map((n) => {
                        const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                        const TypeIcon = cfg.icon;
                        return (
                          <TouchableOpacity
                            key={n.id}
                            style={[s.notifCard, !n.is_read && s.notifCardUnread]}
                            onPress={() => handleTapNotif(n)}
                            activeOpacity={0.7}
                          >
                            <View style={[s.notifIcon, { backgroundColor: cfg.bg }]}>
                              <TypeIcon size={16} color={cfg.color} strokeWidth={1.8} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                                {!n.is_read && <View style={s.unreadDot} />}
                              </View>
                              <Text style={s.notifMessage} numberOfLines={2}>{n.message}</Text>
                              <Text style={s.notifTime}>
                                {new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
            {logsLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
            ) : logs.length === 0 ? (
              <Text style={s.emptyText}>Aucun envoi enregistré.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {logs.map((log: any) => {
                  const targetLabel = log.target_type === 'all' ? 'Tous' : log.target_type === 'haiti' ? 'Haïti' : 'Rép. Dom.';
                  return (
                    <View key={log.id} style={s.notifCard}>
                      <View style={[s.notifIcon, { backgroundColor: 'rgba(34,197,94,0.14)' }]}>
                        <Megaphone size={16} color={ACCENT} strokeWidth={1.8} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.notifTitle} numberOfLines={1}>{log.title}</Text>
                        <Text style={s.notifMessage} numberOfLines={2}>{log.message}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: ACCENT }}>{targetLabel}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>{log.sent_count} envoyé{log.sent_count > 1 ? 's' : ''}</Text>
                          <Text style={s.notifTime}>
                            {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* SEND MODAL */}
      <Modal visible={showSend} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nouvelle notification</Text>
              <TouchableOpacity onPress={() => setShowSend(false)}>
                <X size={20} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <Text style={s.formLabel}>Titre</Text>
              <TextInput
                style={s.formInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Titre de la notification"
                placeholderTextColor="#5B6470"
              />

              <Text style={s.formLabel}>Message ({message.length}/160)</Text>
              <TextInput
                style={[s.formInput, { height: 90, textAlignVertical: 'top' }]}
                value={message}
                onChangeText={(v) => setMessage(v.slice(0, 160))}
                placeholder="Message..."
                placeholderTextColor="#5B6470"
                multiline
                maxLength={160}
              />

              {/* Preview */}
              {(title.trim() || message.trim()) && (
                <View style={s.previewCard}>
                  <Text style={s.previewLabel}>Aperçu</Text>
                  <View style={s.previewNotif}>
                    <View style={s.previewDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.previewApp}>JJ's IMEX</Text>
                      <Text style={s.previewTitle}>{title || 'Titre'}</Text>
                      <Text style={s.previewMsg} numberOfLines={2}>{message || 'Message...'}</Text>
                    </View>
                    <Text style={s.previewTime}>now</Text>
                  </View>
                </View>
              )}

              <Text style={s.formLabel}>Cible</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { key: 'all', label: 'Tous', icon: Globe },
                  { key: 'haiti', label: 'Haïti', icon: MapPin },
                  { key: 'dr', label: 'Rép. Dom.', icon: MapPin },
                ] as const).map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[s.targetBtn, target === t.key && s.targetBtnActive]}
                    onPress={() => setTarget(t.key)}
                    activeOpacity={0.8}
                  >
                    <t.icon size={12} color={target === t.key ? '#0D0D0D' : '#9CA3AF'} strokeWidth={2} />
                    <Text style={[s.targetText, target === t.key && s.targetTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.sendBtn, sending && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.7}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#0D0D0D" />
                ) : (
                  <>
                    <Send size={16} color="#0D0D0D" strokeWidth={2} />
                    <Text style={s.sendBtnText}>Envoyer maintenant</Text>
                  </>
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
  headerBadge: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: '#0D0D0D' },
  sendToggle: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },

  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 18, marginTop: 12, marginBottom: 6, paddingVertical: 10,
    borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  markAllText: { fontSize: 12, fontWeight: '600', color: ACCENT },

  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 40 },

  groupLabel: {
    fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1F1F1F',
  },
  notifCardUnread: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: '#1E1A16' },
  notifIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  notifMessage: { fontSize: 12, color: '#9CA3AF', marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 10, color: '#4B5563', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  formLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: -6 },
  formInput: {
    height: 44, backgroundColor: '#0D0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 14, fontSize: 13,
  },

  previewCard: {
    backgroundColor: '#222222', borderRadius: 12, padding: 12, gap: 8,
  },
  previewLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase' },
  previewNotif: {
    flexDirection: 'row', gap: 10, backgroundColor: '#2A2A2A',
    borderRadius: 12, padding: 12,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT, marginTop: 4 },
  previewApp: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  previewTitle: { fontSize: 13, color: '#FFFFFF', fontWeight: '700', marginTop: 1 },
  previewMsg: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  previewTime: { fontSize: 10, color: '#4B5563' },

  targetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    height: 38, borderRadius: 10, backgroundColor: '#0D0D0D',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  targetBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  targetText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  targetTextActive: { color: '#0D0D0D' },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, backgroundColor: ACCENT, borderRadius: 12, marginTop: 6, marginBottom: 20,
  },
  sendBtnText: { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },

  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 38, borderRadius: 10, backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  tabBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  tabBtnTextActive: { color: '#0D0D0D' },
});
