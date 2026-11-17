import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const ACCENT = '#22C55E';

export default function SplashScreen() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(8)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.55)).current;
  const loadX = useRef(new Animated.Value(-0.38)).current;

  useEffect(() => {
    // Logo fade in + slide up
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(logoY, { toValue: 0, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1.08, duration: 2250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.85, duration: 2250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1, duration: 2250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.55, duration: 2250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Loading bar slide loop
    Animated.loop(
      Animated.timing(loadX, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ).start();

    const timer = setTimeout(() => {
      if (!loading && session && profile) {
        const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'employee';
        router.replace(isAdmin ? '/(tabs-admin)/' : '/(tabs-client)/');
      } else {
        router.replace('/onboarding');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading, session, profile]);

  return (
    <View style={s.container}>

      {/* Logo text */}
      <Animated.View style={[s.logoBlock, {
        opacity: logoFade,
        transform: [{ translateY: logoY }],
      }]}>
        <View style={s.logoRow}>
          <Text style={s.logoWhite}>JJ</Text>
          <Text style={s.logoOrange}>'s</Text>
          <Text style={[s.logoWhite, { marginLeft: 10 }]}> IMEX</Text>
        </View>
        <Text style={s.tagline}>Beyond Just Shipping</Text>
      </Animated.View>

      {/* Loading bar */}
      <View style={s.loadBar}>
        <Animated.View style={[s.loadFill, {
          transform: [{
            translateX: loadX.interpolate({
              inputRange: [-0.38, 1],
              outputRange: [-46, 120],
            }),
          }],
        }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: 'rgba(34,197,94,0.38)',
  },
  logoBlock: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoWhite: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  logoOrange: {
    color: ACCENT,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  tagline: {
    marginTop: 18,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  loadBar: {
    position: 'absolute',
    bottom: 64,
    width: 120,
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  loadFill: {
    width: '38%',
    height: '100%',
    borderRadius: 99,
    backgroundColor: ACCENT,
  },
});
