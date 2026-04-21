import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

type DaySchedule = {
  enabled: boolean;
  start_time: string;
  end_time: string;
};

type WeekSchedule = Record<number, DaySchedule>;

const defaultSchedule = (): WeekSchedule =>
  Object.fromEntries(DAYS.map(d => [d.value, { enabled: d.value >= 1 && d.value <= 5, start_time: '08:00', end_time: '18:00' }]));

// Format date as YYYY-MM-DD using local time (avoid UTC offset issues)
const localDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ProviderScheduleScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<WeekSchedule>(defaultSchedule());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar'>('schedule');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: schData }, { data: blkData }] = await Promise.all([
          supabase.from('provider_schedule').select('*').eq('provider_id', user.id),
          supabase.from('provider_blocked_dates').select('*').eq('provider_id', user.id),
        ]);
        if (schData && schData.length > 0) {
          const next = defaultSchedule();
          // Disable all by default, only enable saved days
          Object.keys(next).forEach(k => { next[Number(k)].enabled = false; });
          schData.forEach((row: any) => {
            next[row.day_of_week] = { enabled: true, start_time: row.start_time.slice(0, 5), end_time: row.end_time.slice(0, 5) };
          });
          setSchedule(next);
        }
        if (blkData) setBlockedDates(blkData.map((r: any) => r.blocked_date));
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSaveSchedule = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Upsert schedule rows for enabled days, delete for disabled
      const enabledDays = DAYS.filter(d => schedule[d.value].enabled);
      const disabledDays = DAYS.filter(d => !schedule[d.value].enabled);

      if (enabledDays.length > 0) {
        const { error } = await supabase.from('provider_schedule').upsert(
          enabledDays.map(d => ({
            provider_id: user.id,
            day_of_week: d.value,
            start_time: schedule[d.value].start_time,
            end_time: schedule[d.value].end_time,
          })),
          { onConflict: 'provider_id,day_of_week' }
        );
        if (error) throw error;
      }
      if (disabledDays.length > 0) {
        await supabase.from('provider_schedule')
          .delete()
          .eq('provider_id', user.id)
          .in('day_of_week', disabledDays.map(d => d.value));
      }

      showToast('Horários salvos com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBlockedDate = async (dateStr: string) => {
    if (!user) return;
    const isBlocked = blockedDates.includes(dateStr);
    try {
      if (isBlocked) {
        await supabase.from('provider_blocked_dates').delete().eq('provider_id', user.id).eq('blocked_date', dateStr);
        setBlockedDates(prev => prev.filter(d => d !== dateStr));
      } else {
        await supabase.from('provider_blocked_dates').upsert({ provider_id: user.id, blocked_date: dateStr }, { onConflict: 'provider_id,blocked_date' });
        setBlockedDates(prev => [...prev, dateStr]);
      }
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error');
    }
  };

  // Calendar helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = localDateStr(new Date());
  const monthLabel = calendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));

  return (
    <div className="netflix-main-bg font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased text-white">
      <div className="relative flex min-h-screen w-full flex-col max-w-2xl mx-auto netflix-main-bg shadow-xl overflow-x-hidden text-white">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500] flex items-start gap-3 w-[90vw] max-w-sm px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md
            animate-[slideInDown_0.35s_ease-out]
            ${toast.type === 'success'
              ? 'bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 border-emerald-400/30 text-white'
              : 'bg-gradient-to-br from-red-500/90 to-red-700/90 border-red-400/30 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-2xl mt-0.5 shrink-0">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="text-sm flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Header */}
        <header className="flex items-center p-4 netflix-main-bg text-white border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
          <button onClick={() => onNavigate('dashboard')} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold">Minha Agenda</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Horários e disponibilidade</p>
          </div>
          <div className="w-10" />
        </header>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 netflix-main-bg text-white sticky top-[65px] z-10">
          {[{ id: 'schedule', label: 'Horários', icon: 'schedule' }, { id: 'calendar', label: 'Bloqueios', icon: 'event_busy' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto scroll-smooth pb-28">

            {/* ─── Tab: Horários Semanais ─── */}
            {activeTab === 'schedule' && (
              <div className="p-4 space-y-3">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 mb-2">
                  <p className="text-xs text-primary font-medium">
                    💡 Configure os dias e horários em que você costuma trabalhar. Clientes verão quando você está disponível.
                  </p>
                </div>

                {DAYS.map(day => {
                  const s = schedule[day.value];
                  return (
                    <div
                      key={day.value}
                      className={`rounded-2xl border transition-all ${s.enabled
                        ? 'bg-white dark:bg-slate-800 border-primary/30 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Toggle */}
                        <button
                          onClick={() => setSchedule(prev => ({ ...prev, [day.value]: { ...prev[day.value], enabled: !prev[day.value].enabled } }))}
                          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${s.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-6' : 'left-1'}`} />
                        </button>
                        <span className="font-bold text-sm w-8 shrink-0">{day.label}</span>
                        {s.enabled ? (
                          <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Das</span>
                              <input
                                type="time"
                                value={s.start_time}
                                onChange={e => setSchedule(prev => ({ ...prev, [day.value]: { ...prev[day.value], start_time: e.target.value } }))}
                                className="text-sm font-medium bg-slate-100 dark:bg-slate-700 border-0 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">às</span>
                              <input
                                type="time"
                                value={s.end_time}
                                onChange={e => setSchedule(prev => ({ ...prev, [day.value]: { ...prev[day.value], end_time: e.target.value } }))}
                                className="text-sm font-medium bg-slate-100 dark:bg-slate-700 border-0 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic ml-auto">Indisponível</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                  className="w-full mt-4 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {isSaving
                    ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    : <><span className="material-symbols-outlined text-[18px]">save</span> Salvar Horários</>
                  }
                </button>
              </div>
            )}

            {/* ─── Tab: Calendário de Bloqueios ─── */}
            {activeTab === 'calendar' && (
              <div className="p-4">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-3.5 mb-4">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    🚫 Toque em uma data para marcar como bloqueada (férias, feriados, compromissos). Toque novamente para desbloquear.
                  </p>
                </div>

                {/* Calendar Header */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <button onClick={prevMonth} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <span className="font-bold text-sm capitalize">{monthLabel}</span>
                    <button onClick={nextMonth} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => (
                      <div key={i} className="text-center text-[11px] font-bold text-slate-400 py-2">{l}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 p-2 gap-1">
                    {/* Empty cells for first day offset */}
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isBlocked = blockedDates.includes(dateStr);
                      const isToday = dateStr === today;
                      const isPast = dateStr < today;
                      return (
                        <button
                          key={dayNum}
                          onClick={() => !isPast && toggleBlockedDate(dateStr)}
                          disabled={isPast}
                          className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all
                            ${isBlocked
                              ? 'bg-red-500 text-white shadow-sm shadow-red-200 dark:shadow-red-900'
                              : isToday
                              ? 'bg-primary text-white ring-2 ring-primary ring-offset-1'
                              : isPast
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95'
                            }`}
                        >
                          {dayNum}
                          {isBlocked && <span className="sr-only">Bloqueado</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legenda */}
                <div className="flex gap-4 justify-center mt-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full bg-primary" />
                    <span>Hoje</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full bg-red-500" />
                    <span>Bloqueado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full bg-slate-200 dark:bg-slate-600" />
                    <span>Disponível</span>
                  </div>
                </div>

                {/* Lista de bloqueios */}
                {blockedDates.filter(d => d >= today).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                      Próximos dias bloqueados ({blockedDates.filter(d => d >= today).length})
                    </h3>
                    <div className="space-y-2">
                      {blockedDates
                        .filter(d => d >= today)
                        .sort()
                        .map(dateStr => {
                          const dt = new Date(dateStr + 'T12:00:00');
                          return (
                            <div key={dateStr} className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500 text-[18px]">event_busy</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleBlockedDate(dateStr)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        )}

      </div>
    </div>
  );
}
