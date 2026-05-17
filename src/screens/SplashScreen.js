import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
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
        <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.brandLarge}>CORE</Text>
        <Text style={styles.tagline}>Centralized Operations & Resource Engine</Text>
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
  logoImage: {
    width: 280,
    height: 100,
    marginBottom: 8,
  },
  brandLarge: {
    fontSize: 80,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 38,
    lineHeight: 88,
    marginLeft: 38,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});
