'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionView } from '@/components/app/session-view';
import { WelcomeView } from '@/components/app/welcome-view';
import { MemoryPanel } from '@/components/memory';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { ToolsPanel } from '@/components/tools';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(SessionView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  return (
    <>
      <AnimatePresence mode="wait">
        {/* Welcome view */}
        {!isConnected && (
          <MotionWelcomeView
            key="welcome"
            {...VIEW_MOTION_PROPS}
            onStartCall={start}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenTools={() => setToolsOpen(true)}
            onOpenMemory={() => setMemoryOpen(true)}
          />
        )}
        {/* Session view */}
        {isConnected && (
          <MotionSessionView
            key="session-view"
            {...VIEW_MOTION_PROPS}
            appConfig={appConfig}
            onOpenMemory={() => setMemoryOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Tools panel */}
      <ToolsPanel isOpen={toolsOpen} onClose={() => setToolsOpen(false)} />

      {/* Memory panel */}
      <MemoryPanel isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} />
    </>
  );
}
