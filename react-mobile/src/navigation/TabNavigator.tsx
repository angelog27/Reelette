import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { SpinScreen }     from '../screens/home/SpinScreen';
import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { SocialScreen }   from '../screens/social/SocialScreen';
import { MyStuffScreen }  from '../screens/mystuff/MyStuffScreen';
import { ProfileScreen }  from '../screens/profile/ProfileScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<keyof TabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Spin:     { active: 'home',          inactive: 'home-outline' },
  Discover: { active: 'film',          inactive: 'film-outline' },
  Social:   { active: 'people',        inactive: 'people-outline' },
  MyStuff:  { active: 'bookmark',      inactive: 'bookmark-outline' },
  Profile:  { active: 'person-circle', inactive: 'person-circle-outline' },
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#080808',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 10,
          height: 54 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.28)',
        tabBarIcon: ({ focused, color, size }) => {
          const icons = ICONS[route.name as keyof TabParamList];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={focused ? size + 1 : size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Spin"     component={SpinScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Social"   component={SocialScreen} />
      <Tab.Screen name="MyStuff"  component={MyStuffScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}
