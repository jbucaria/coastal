import React from 'react'
import { Platform } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SymbolView } from 'expo-symbols'

// Mapping from SF Symbol names to MaterialIcons names for non‑iOS platforms
const MAPPING = {
  plus: 'add',
  home: 'home',
  'dollarsign.circle': 'attach-money',
  map: 'map',
  gear: 'settings',
  checkmark: 'check',
  magnifyingglass: 'search',
  calander: 'calendar-today', // Adjust spelling if needed
  'xmark.circle': 'cancel',
  'arrow.left.square': 'arrow-back',
}

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}) {
  if (Platform.OS === 'ios') {
    // Use SF Symbols on iOS
    return (
      <SymbolView
        name={name}
        size={size}
        tintColor={color}
        weight={weight}
        style={style}
        resizeMode="scaleAspectFit"
      />
    )
  } else {
    // Use MaterialIcons on Android and web
    const mappedName = MAPPING[name] || 'help-outline'
    return (
      <MaterialIcons
        name={mappedName}
        size={size}
        color={color}
        style={style}
      />
    )
  }
}
