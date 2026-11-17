import { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  listContainer: { padding: 16, paddingBottom: 40 },
  notificationCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, marginBottom: 10 },
  notificationCardUnread: { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.05)' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 },
  notifBody: { fontSize: 13, color: '#D1D5DB', marginBottom: 8 },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  clearButton: { height: 44, backgroundColor: '#22C55E', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginBottom: 20 },
  clearButtonText: { color: '#0D0D0D', fontWeight: '700', fontSize: 14 },
});

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

function formatTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins}m`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authContext?.user) {
      router.back();
      return;
    }
    loadNotifications();

    const channel = supabase
      .channel(`notifications:${authContext.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authContext.user.id}`,
        },
        () => loadNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authContext?.user]);

  async function loadNotifications() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authContext!.user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data ?? []) as Notification[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notifId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);

      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async function clearAll() {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', authContext!.user!.id);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#FFFFFF', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={S.emptyState}>
          <ActivityIndicator color="#22C55E" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={S.emptyState}>
          <Text style={S.emptyIcon}>🔔</Text>
          <Text style={S.emptyText}>Aucune notification</Text>
        </View>
      ) : (
        <>
          {unreadCount > 0 && (
            <TouchableOpacity style={S.clearButton} onPress={clearAll}>
              <Text style={S.clearButtonText}>Marquer tout comme lu ({unreadCount})</Text>
            </TouchableOpacity>
          )}
          <ScrollView style={S.listContainer} showsVerticalScrollIndicator={false}>
            {notifications.map(notif => (
              <TouchableOpacity
                key={notif.id}
                onPress={() => markAsRead(notif.id)}
                style={[S.notificationCard, !notif.is_read && S.notificationCardUnread]}
              >
                <Text style={S.notifTitle}>{notif.title}</Text>
                <Text style={S.notifBody}>{notif.message}</Text>
                <Text style={S.notifTime}>{formatTime(notif.created_at)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}
