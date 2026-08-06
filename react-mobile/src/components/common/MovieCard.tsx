import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Colors, PROVIDER_COLORS } from '../../constants/colors';
import type { Movie } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');

interface PortraitCardProps {
  movie: Movie;
  width?: number;
  onPress: () => void;
  priority?: boolean;
}

export function PortraitCard({ movie, width = 120, onPress, priority }: PortraitCardProps) {
  const height = Math.round(width * 1.5);
  const posterUri = movie.poster
    ? movie.poster.replace(/\/t\/p\/\w+\//, '/t/p/w185/')
    : '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ width }}>
      <View style={[styles.posterWrap, { width, height }]}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            priority={priority ? 'high' : 'normal'}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.posterPlaceholder]} />
        )}
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.cardTitle} numberOfLines={2}>{movie.title}</Text>
        {movie.year > 0 && <Text style={styles.cardYear}>{movie.year}</Text>}
      </View>
    </TouchableOpacity>
  );
}

interface LandscapeCardProps {
  movie: Movie;
  width?: number;
  onPress: () => void;
  priority?: boolean;
}

export function LandscapeCard({ movie, width = 280, onPress, priority }: LandscapeCardProps) {
  const height = Math.round(width * 0.56);
  const src = movie.backdrop || movie.poster || '';
  const imgUri = src ? src.replace(/\/t\/p\/\w+\//, '/t/p/w780/') : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.landscapeCard, { width, height }]}
    >
      {imgUri ? (
        <Image
          source={{ uri: imgUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          priority={priority ? 'high' : 'normal'}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.posterPlaceholder]} />
      )}
      <View style={styles.landscapeOverlay} />
      <View style={styles.landscapeContent}>
        <Text style={styles.landscapeTitle} numberOfLines={2}>{movie.title}</Text>
        {movie.rating > 0 && (
          <Text style={styles.landscapeRating}>★ {movie.rating.toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface SectionRowProps {
  label: string;
  movies: Movie[] | null;
  onMoviePress: (movie: Movie) => void;
  cardType?: 'portrait' | 'landscape';
}

export function SectionRow({ label, movies, onMoviePress, cardType = 'portrait' }: SectionRowProps) {
  if (!movies || movies.length === 0) return null;

  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
      >
        {movies.slice(0, 14).map((movie, i) =>
          cardType === 'portrait' ? (
            <PortraitCard
              key={movie.id}
              movie={movie}
              onPress={() => onMoviePress(movie)}
              priority={i === 0}
            />
          ) : (
            <LandscapeCard
              key={movie.id}
              movie={movie}
              onPress={() => onMoviePress(movie)}
              priority={i === 0}
            />
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  posterWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
  },
  posterPlaceholder: {
    backgroundColor: Colors.bgElevated,
  },
  cardMeta: {
    marginTop: 7,
    paddingHorizontal: 2,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  cardYear: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  landscapeCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
  },
  landscapeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  landscapeContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 24,
    backgroundColor: 'transparent',
  },
  landscapeTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  landscapeRating: {
    color: '#fbbf24',
    fontSize: 11,
    marginTop: 3,
  },
  sectionWrap: {
    marginTop: 28,
  },
  sectionLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  rowContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
  },
});
