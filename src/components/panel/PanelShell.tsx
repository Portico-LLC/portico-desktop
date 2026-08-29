import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PanelHeader } from '@/components/panel/PanelHeader';
import { TasksTab } from '@/components/panel/TasksTab';
import { CalendarTab } from '@/components/panel/CalendarTab';
import { MessagesTab } from '@/components/panel/MessagesTab';
import { ProjectsTab } from '@/components/panel/ProjectsTab';
import { RadarTab } from '@/components/panel/RadarTab';
import { CallTab } from '@/components/panel/CallTab';
import { VaultTab } from '@/components/panel/VaultTab';
import { RecordTab } from '@/components/panel/RecordTab';
import { PreferencesTab } from '@/components/panel/PreferencesTab';
import { usePanelPrefsStore } from '@/store/panelPrefs';
import { motionTransition, springs } from '@/lib/motion/springs';
import type { PanelPrefs } from '@/types/electron';

export function PanelShell() {
  const prefs = usePanelPrefsStore((s) => s.prefs);
  const setPref = usePanelPrefsStore((s) => s.setPref);
  const [activeTab, setActiveTab] = useState<PanelPrefs['activeTab']>(prefs.activeTab);
  const reduce = !!useReducedMotion();

  // Seed from persisted prefs once they've loaded (avoids flashing "tasks" then
  // jumping to the real last-active tab after the async prefs.get() resolves).
  useEffect(() => {
    setActiveTab(prefs.activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return window.portico?.panel.onSetTab((tab) => setActiveTab(tab));
  }, []);

  const handleTabChange = (tab: PanelPrefs['activeTab']) => {
    setActiveTab(tab);
    setPref({ activeTab: tab });
  };

  return (
    <>
      <PanelHeader activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="h-full"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={motionTransition(reduce, springs.snappy)}
          >
            {activeTab === 'tasks' && <TasksTab />}
            {activeTab === 'calendar' && <CalendarTab />}
            {activeTab === 'messages' && <MessagesTab />}
            {activeTab === 'projects' && <ProjectsTab />}
            {activeTab === 'radar' && <RadarTab />}
            {activeTab === 'calls' && <CallTab />}
            {activeTab === 'vault' && <VaultTab />}
            {activeTab === 'record' && <RecordTab />}
            {activeTab === 'preferences' && <PreferencesTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
