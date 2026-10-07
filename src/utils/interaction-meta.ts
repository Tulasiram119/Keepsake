import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { InteractionType } from '@/types/models';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const INTERACTION_TYPES: readonly InteractionType[] = ['met', 'called', 'texted', 'video'];

export const INTERACTION_META: Record<
  InteractionType,
  { label: string; past: string; icon: IconName }
> = {
  met: { label: 'Met', past: 'Met', icon: 'cafe-outline' },
  called: { label: 'Call', past: 'Called', icon: 'call-outline' },
  texted: { label: 'Text', past: 'Texted', icon: 'chatbubble-ellipses-outline' },
  video: { label: 'Video', past: 'Video called', icon: 'videocam-outline' },
};
