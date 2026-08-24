import { KeyRound, StickyNote, Terminal } from 'lucide-react';
import type { VaultItemType } from '@/lib/types';

export const ITEM_TYPE_META: Record<VaultItemType, { label: string; icon: React.ReactNode }> = {
  login: { label: 'Login', icon: <KeyRound size={16} /> },
  note: { label: 'Secure Note', icon: <StickyNote size={16} /> },
  api_credential: { label: 'API Credential', icon: <Terminal size={16} /> },
};
