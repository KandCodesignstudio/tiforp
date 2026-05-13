import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../utils/colors';

export default function SplashScreen() {
  const scaleAnim = new Animated.Value(0.8);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <Text style={styles.brandSmall}>ITforP</Text>
        <Text style={styles.brandLarge}>CORE</Text>
        <Text style={styles.tagline}>Technician Field Operations</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  brandSmall: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.accentLight,
    letterSpacing: 6,
    marginBottom: -4,
  },
  brandLarge: {
    fontSize: 80,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -2,
    lineHeight: 88,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});
