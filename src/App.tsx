/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import {AuthFlow} from './components/auth/AuthFlow';
import {AppShell} from './components/layout/AppShell';
import {CalendarSection} from './components/sections/CalendarSection';
import {FinanceSection} from './components/sections/FinanceSection';
import {GoalsSection} from './components/sections/GoalsSection';
import {HabitsSection} from './components/sections/HabitsSection';
import {HomeDashboard} from './components/sections/HomeDashboard';
import {MySpaceSection} from './components/sections/MySpaceSection';
import {ProfileSettingsSection} from './components/sections/ProfileSettingsSection';
import {TasksSection} from './components/sections/TasksSection';
import {ConfirmModal, ToastBanner} from './components/ui/CommonUI';
import {AppProvider, useApp} from './context/AppContext';

function OneSpaceRouter() {
  const {user, isAuthReady, activeSection} = useApp();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#D7E6EE] dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-os-border-strong dark:border-slate-800 p-6 text-center shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-os-primary mx-auto animate-pulse" />
          <p className="mt-3 text-sm font-display font-semibold text-os-ink dark:text-slate-100">
            Loading OneSpace 2.0...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !user.profileCompleted) {
    return (
      <>
        <AuthFlow />
        <ToastBanner />
      </>
    );
  }

  return (
    <>
      <AppShell>
        {activeSection === 'home' && <HomeDashboard />}
        {activeSection === 'tasks' && <TasksSection />}
        {activeSection === 'calendar' && <CalendarSection />}
        {activeSection === 'habits' && <HabitsSection />}
        {activeSection === 'finance' && <FinanceSection />}
        {activeSection === 'goals' && <GoalsSection />}
        {activeSection === 'myspace' && <MySpaceSection />}
        {activeSection === 'profile' && <ProfileSettingsSection />}
      </AppShell>
      <ConfirmModal />
      <ToastBanner />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <OneSpaceRouter />
    </AppProvider>
  );
}
