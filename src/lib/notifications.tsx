import { MessageSquare, Hash, CheckSquare, AtSign, Gamepad2 } from 'lucide-react';
import type { NotificationType } from '@/lib/types';

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  team_message: <Hash size={14} />,
  client_message: <MessageSquare size={14} />,
  task_assigned: <CheckSquare size={14} />,
  mention: <AtSign size={14} />,
  game_invite: <Gamepad2 size={14} />,
};
