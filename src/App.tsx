import { useEffect, useState } from 'react';
import { Trash2, Send, Smile, Meh, Frown, Sun, Moon, Loader2 } from 'lucide-react';

// ⚠️ 注意：测试成功后，记得去 DeepSeek 后台作废这个 Key 并换新的！
const API_KEY = 'sk-acc7263594164138b70e903984c6a895';

type Mood = '很好' | '一般' | '差';

interface Record {
  id: string;
  mood: Mood;
  note: string;
  time: number;
}

const STORAGE_KEY = 'mood-checkin-records';
const THEME_KEY = 'mood-checkin-theme';

type ThemeMode = 'light' | 'dark';

const MOOD_CONFIG: Record<Mood, { color: string; bg: string; border: string; icon: typeof Smile }> = {
  很好: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    icon: Smile,
  },
  一般: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/50',
    icon: Meh,
  },
  差: {
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800/50',
    icon: Frown,
  },
};

function loadRecords(): Record[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return 'light';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function App() {
  const [mood, setMood] = useState<Mood>('很好');
  const [note, setNote] = useState('');
  const [records, setRecords] = useState<Record[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRecords(loadRecords());
    setTheme(loadTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  };

  const persist = (list: Record[]) => {
    setRecords(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleSave = async () => {
    if (isSaving) return; 
    
    setIsSaving(true);
    const currentNote = note.trim();
    const currentMood = mood;

    const entry: Record = {
      id: crypto.randomUUID(),
      mood: currentMood,
      note: currentNote,
      time: Date.now(),
    };
    persist([entry, ...records]);
    setNote('');
    setMood('很好');

    try {
      const prompt = `我今天心情${currentMood}。${currentNote ? `我记录的事情是：${currentNote}` : ''} 请作为我的专属树洞，给我一句20字以内的简短暖心回复，不要有标点符号之外的废话。`;
      
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 100
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const aiReply = data.choices[0].message.content;
      
      alert(`✨ AI 树洞回复：\n${aiReply}`);
    } catch (error) {
      console.error(error);
      alert('AI 好像睡着了，但你的记录已经稳稳地保存好了！');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    persist([]);
    setShowConfirm(false);
  };

  const moodCounts = records.reduce(
    (acc, r) => {
      acc[r.mood]++;
      return acc;
    },
    { 很好: 0, 一般: 0, 差: 0 } as Record<Mood, number>,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="mx-auto max-w-md px-4 py-8">
        <header className="mb-8 flex items-start justify-between">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">我的状态打卡</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">记录每一天的心情</p >
          </div>
          <button
            onClick={toggleTheme}
            aria-label="切换深色模式"
            className="flex-shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800/60 dark:ring-slate-700/50 transition-colors duration-300">
          <h2 className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">今天感觉怎么样？</h2>

          <div className="mb-5 grid grid-cols-3 gap-3">
            {(Object.keys(MOOD_CONFIG) as Mood[]).map((m) => {
              const cfg = MOOD_CONFIG[m];
              const Icon = cfg.icon;
              const selected = mood === m;
              return (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition-all duration-200 ${selected
                    ? `${cfg.border} ${cfg.bg} scale-105 shadow-sm`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600 dark:hover:bg-slate-700/40'
                    }`}
                >
                  <Icon
                    className={`h-7 w-7 transition-transform duration-200 ${selected ? cfg.color : 'text-slate-400 dark:text-slate-500'}`}
                    strokeWidth={selected ? 2.5 : 2}
                  />
                  <span className={`text-sm font-medium transition-colors duration-200 ${selected ? cfg.color : 'text-slate-500 dark:text-slate-400'}`}>
                    {m}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="写点什么（可选）"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-600"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-700 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 正在思考...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                保存
              </>
            )}
          </button>
        </section>

        {records.length > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800/60 dark:ring-slate-700/50 transition-colors duration-300">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">共 {records.length} 条记录</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Smile className="h-3.5 w-3.5" /> {moodCounts['很好']}
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Meh className="h-3.5 w-3.5" /> {moodCounts['一般']}
              </span>
              <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                <Frown className="h-3.5 w-3.5" /> {moodCounts['差']}
              </span>
            </div>
          </div>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">打卡记录</h2>
            {records.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1 text-xs font-medium text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                清空全部
              </button>
            )}
          </div>

          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
              <p className="text-sm text-slate-400 dark:text-slate-500">还没有记录，快来打个卡吧～</p >
            </div>
          ) : (
            <ul className="space-y-4">
              {records.map((r) => {
                const cfg = MOOD_CONFIG[r.mood];
                const Icon = cfg.icon;
                return (
                  <li
                    key={r.id}
                    className={`rounded-2xl ${cfg.bg} border ${cfg.border} p-5 shadow-sm transition-all duration-200 hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${cfg.bg} ring-1 ${cfg.border}`}>
                          <Icon className={`h-5 w-5 ${cfg.color}`} strokeWidth={2.5} />
                        </span>
                        <span className={`text-base font-bold ${cfg.color}`}>{r.mood}</span>
                      </div>
                      <span className="flex-shrink-0 pt-1 text-xs text-slate-400 dark:text-slate-500">{formatTime(r.time)}</span>
                    </div>
                    {r.note && (
                      <p className="mt-3 break-words border-t border-slate-200/50 pt-3 text-sm leading-relaxed text-slate-600 dark:border-slate-700/50 dark:text-slate-300">
                        {r.note}
                      </p >
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">确认清空？</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">这将删除所有打卡记录，无法恢复。</p >
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
