import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import type { CompositeScreenProps } from '@react-navigation/native';

// ── Root Stack ─────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Landing:   undefined;
  Main:      undefined;
};

// ── Main Bottom Tabs ───────────────────────────────────────────────────────────
export type TabParamList = {
  Spin:     undefined;
  Discover: undefined;
  Social:   undefined;
  MyStuff:  undefined;
  Profile:  undefined;
};

// ── Screen prop helpers ────────────────────────────────────────────────────────
export type LandingScreenProps = StackScreenProps<RootStackParamList, 'Landing'>;
export type MainScreenProps    = StackScreenProps<RootStackParamList, 'Main'>;

export type SpinScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Spin'>,
  StackScreenProps<RootStackParamList>
>;
export type DiscoverScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Discover'>,
  StackScreenProps<RootStackParamList>
>;
export type SocialScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Social'>,
  StackScreenProps<RootStackParamList>
>;
export type MyStuffScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'MyStuff'>,
  StackScreenProps<RootStackParamList>
>;
export type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  StackScreenProps<RootStackParamList>
>;
