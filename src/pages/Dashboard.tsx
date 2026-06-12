import { useEffect, useState } from "react";
import { useAppStore } from "../store";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Leaf, ArrowDownToLine, Zap, Bus, ShoppingBag, Droplet, ChevronRight, Loader2, Download, Check, Bell } from "lucide-react";
import { generatePDFReport } from "../lib/report-generator";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { NotificationsPopover } from "../components/layout/NotificationsPopover";
import { HabitManager } from "../components/dashboard/HabitManager";
import { ActionModal } from "../components/dashboard/ActionModal";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];
const CATEGORY_ICONS: Record<string, any> = {
  "Transport": Bus,
  "Home Energy": Zap,
  "Food": Leaf,
  "Shopping": ShoppingBag,
  "Waste": Droplet,
};

export function Dashboard() {
  const { user, carbonData, actions, updateCarbonData, fetchRecommendations, fetchMissions, isLoading, habits, toggleHabit, activities, missions } = useAppStore();
  const navigate = useNavigate();

  const [trendTimeframe, setTrendTimeframe] = useState<'Day' | 'Week' | 'Month' | '6 Months' | 'Year'>('6 Months');
  const [trendFilterOpen, setTrendFilterOpen] = useState(false);

  const getTrendData = () => {
    const baseMonthly = carbonData.total || 210;
    const history = carbonData.history || [];

    const completedActions = actions.filter(a => a.completed);
    const completedMissions = missions ? missions.filter(m => m.completed) : [];
    const completedHabits = habits ? habits.filter(h => h.completed) : [];

    const actionSavingsMonthly = completedActions.reduce((sum, a) => sum + (a.carbonReduction || 0), 0);
    const missionSavingsMonthly = completedMissions.length * 10;
    const habitSavingsMonthly = completedHabits.length * 5;

    const totalMonthlySavings = actionSavingsMonthly + missionSavingsMonthly + habitSavingsMonthly;

    if (trendTimeframe === 'Day') {
      const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
      const dailyBase = baseMonthly / 30;
      const todayStr = new Date().toDateString();
      const todayActivities = activities ? activities.filter(act => {
        return act.timestamp && new Date(act.timestamp).toDateString() === todayStr;
      }) : [];

      return hours.map((hour) => {
        const hrValue = parseInt(hour.split(':')[0]);
        let todaySavings = 0;
        todayActivities.forEach(act => {
          if (act.timestamp) {
            const actHour = new Date(act.timestamp).getHours();
            if (actHour <= hrValue) {
              if (act.type === 'action') todaySavings += 0.5;
              if (act.type === 'mission') todaySavings += 1.0;
              if (act.type === 'habit') todaySavings += 0.25;
            }
          }
        });

        const baseDailySaving = habitSavingsMonthly / 30;
        const finalValue = Math.max(1, dailyBase - baseDailySaving - todaySavings);
        return {
          name: hour,
          value: Math.round(finalValue * 10) / 10
        };
      });

    } else if (trendTimeframe === 'Week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyBase = baseMonthly / 30;
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      startOfWeek.setHours(0, 0, 0, 0);

      return days.map((day, idx) => {
        let daySavings = 0;
        if (activities) {
          activities.forEach(act => {
            if (act.timestamp) {
              const actDate = new Date(act.timestamp);
              const dayIdx = (actDate.getDay() + 6) % 7; // Mon is 0, Sun is 6
              if (actDate >= startOfWeek && dayIdx <= idx) {
                if (act.type === 'action') daySavings += 0.8;
                if (act.type === 'mission') daySavings += 1.5;
                if (act.type === 'habit') daySavings += 0.4;
              }
            }
          });
        }

        const dayHabitSavings = habitSavingsMonthly / 30;
        const finalValue = Math.max(2, dailyBase - dayHabitSavings - daySavings);
        return {
          name: day,
          value: Math.round(finalValue * 10) / 10
        };
      });

    } else if (trendTimeframe === 'Month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklyBase = baseMonthly / 4.28;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      return weeks.map((week, idx) => {
        let weekSavings = 0;
        if (activities) {
          activities.forEach(act => {
            if (act.timestamp) {
              const actDate = new Date(act.timestamp);
              if (actDate >= startOfMonth) {
                const weekOfAct = Math.floor((actDate.getDate() - 1) / 7);
                if (weekOfAct <= idx) {
                  if (act.type === 'action') weekSavings += 3;
                  if (act.type === 'mission') weekSavings += 6;
                  if (act.type === 'habit') weekSavings += 1.5;
                }
              }
            }
          });
        }

        const weeklyHabitSavings = habitSavingsMonthly / 4.28;
        const finalValue = Math.max(5, weeklyBase - weeklyHabitSavings - weekSavings);
        return {
          name: week,
          value: Math.round(finalValue)
        };
      });

    } else if (trendTimeframe === '6 Months') {
      if (history.length > 0) {
        return history.map((h, idx) => {
          const progressFactor = idx / (history.length - 1 || 1);
          const realSavings = totalMonthlySavings * progressFactor;
          const finalValue = Math.max(50, h.value - realSavings);
          return {
            name: h.month,
            value: Math.round(finalValue)
          };
        });
      } else {
        return [
          { name: 'Jan', value: 300 },
          { name: 'Feb', value: 280 },
          { name: 'Mar', value: 250 },
          { name: 'Apr', value: 215 },
          { name: 'May', value: 185 },
          { name: 'Jun', value: Math.round(baseMonthly) },
        ];
      }

    } else if (trendTimeframe === 'Year') {
      const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map((month, idx) => {
        const baseYearlyMonth = 340 - (idx * 11);
        const progressFactor = idx / (months.length - 1 || 1);
        const realSavings = totalMonthlySavings * progressFactor;
        const finalValue = Math.max(50, baseYearlyMonth - realSavings);
        return {
          name: month,
          value: Math.round(finalValue)
        };
      });
    }

    return [];
  };

  const trendData = getTrendData();
  const trendValues = trendData.map(d => d.value);
  const minVal = trendValues.length > 0 ? Math.min(...trendValues) : 0;
  const maxVal = trendValues.length > 0 ? Math.max(...trendValues) : 100;
  const yDomain = [
    Math.max(0, Math.floor(minVal - (maxVal - minVal) * 0.1)),
    Math.ceil(maxVal + (maxVal - minVal) * 0.1 || 10)
  ];

  useEffect(() => {
    const initData = async () => {
      if (user.completedOnboarding) {
        await updateCarbonData();
        await fetchRecommendations();
        await fetchMissions();
      }
    }
    initData();
  }, []);

  const pieData = Object.entries(carbonData.breakdown).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

  if (isLoading && carbonData.total === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f9f4]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 font-medium tracking-tight">Syncing your footprint...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Main Dashboard Panel */}
      <div className="flex-1 p-4 lg:p-8 overflow-y-auto w-full">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight italic">Good morning, <br className="lg:hidden"/><span className="text-primary not-italic">{user.name.split(' ')[0]}</span>!</h1>
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Sustainability Overview</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white border-2 border-neutral-100 rounded-full pl-1.5 pr-4 py-1.5 shadow-sm space-x-2">
               <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shadow-inner">
                  <Leaf size={14} fill="currentColor" />
               </div>
               <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter">EcoPoints</span>
                  <span className="text-sm font-black text-neutral-900">{(user.ecoPoints || 0).toLocaleString()}</span>
               </div>
            </div>

            <Button 
               variant="outline" 
               size="icon" 
               className="md:hidden rounded-full border-neutral-200 text-neutral-600 font-bold h-9 w-9"
               onClick={() => generatePDFReport(user, carbonData)}
            >
              <Download size={14} />
            </Button>
            <Button 
               variant="outline" 
               size="sm" 
               className="hidden md:flex rounded-full border-neutral-200 text-neutral-600 font-bold h-9"
               onClick={() => generatePDFReport(user, carbonData)}
            >
              <Download size={14} className="mr-2" />
              Download Report
            </Button>
            
            <NotificationsPopover />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Main Footprint Card */}
          <Card className="bg-[#0f2e20] overflow-hidden relative text-white border-0 col-span-1 shadow-2xl shadow-green-900/20 rounded-3xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none scale-150">
               <Leaf size={120} fill="currentColor" />
            </div>
            <CardContent className="p-8 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-green-200/60 font-bold text-[10px] uppercase tracking-widest mb-1">Carbon Tracking</p>
                  <p className="text-white font-bold text-sm">Monthly Footprint</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                  <Leaf size={18} className="text-green-300" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2 mb-2">
                <h2 className="text-5xl font-black tracking-tighter">{carbonData.total}</h2>
                <span className="text-sm font-bold text-green-300/80 uppercase tracking-widest">kg CO₂e</span>
              </div>
              
              <div className="inline-flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/5 shadow-inner mb-10 text-green-300">
                <ArrowDownToLine size={12} />
                <span>15% vs last month</span>
              </div>
              
              <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <Check size={14} className="text-green-400" />
                 </div>
                 <p className="text-xs font-bold text-green-100/70 uppercase tracking-tight">Better than 67% of users</p>
              </div>

              {/* Decorative chart lines */}
              <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10 pointer-events-none">
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current text-green-400">
                   <path d="M0,100 L0,50 Q25,30 50,60 T100,20 L100,100 Z" />
                 </svg>
              </div>
            </CardContent>
          </Card>

          <Card className={`rounded-2xl shadow-sm border-neutral-100 flex flex-col justify-between ${carbonData.spent > carbonData.budget ? 'bg-red-50 border-red-100' : ''}`}>
            <CardContent className="p-6">
              <p className={`font-medium text-sm mb-4 ${carbonData.spent > carbonData.budget ? 'text-red-600' : 'text-neutral-500'}`}>
                {carbonData.spent > carbonData.budget ? 'Over Budget' : 'Carbon Budget'}
              </p>
              <div className="flex items-baseline space-x-2 mb-4">
                <h2 className={`text-4xl font-bold tracking-tight ${carbonData.spent > carbonData.budget ? 'text-red-700' : 'text-primary'}`}>
                  {carbonData.spent}
                </h2>
                <span className={`text-xl font-medium ${carbonData.spent > carbonData.budget ? 'text-red-400' : 'text-neutral-400'}`}>
                  / {carbonData.budget} kg
                </span>
              </div>
              
              <Progress 
                value={Math.min((carbonData.spent / carbonData.budget) * 100, 100)} 
                className={`h-2 mb-6 bg-neutral-100 ${carbonData.spent > carbonData.budget ? '[&>div]:bg-red-600' : ''}`} 
              />
              
              <div className="flex items-center space-x-3 mt-auto">
                 <div className="flex-1">
                   {carbonData.spent > carbonData.budget ? (
                     <>
                       <p className="text-sm font-semibold text-red-900 leading-tight">You are {carbonData.spent - carbonData.budget} kg CO<sub className="text-[10px]">2</sub>e</p>
                       <p className="text-sm text-red-600">over your monthly limit.</p>
                     </>
                   ) : (
                     <>
                       <p className="text-sm font-semibold text-neutral-900 leading-tight">You have {carbonData.budget - carbonData.spent} kg CO<sub className="text-[10px]">2</sub>e</p>
                       <p className="text-sm text-neutral-500">remaining this month.</p>
                     </>
                   )}
                 </div>
                 <div className="text-4xl translate-y-1">{carbonData.spent > carbonData.budget ? '⚠️' : '🌍'}</div>
              </div>
            </CardContent>
          </Card>

           {/* Eco Level Card */}
           <Card className="rounded-2xl shadow-sm border-neutral-100 flex flex-col justify-between bg-violet-50/50">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div>
                 <p className="text-neutral-500 font-medium text-sm mb-2">Eco Level</p>
                 <h2 className="text-3xl font-bold text-violet-700 tracking-tight mb-1">Level {user.level}</h2>
                 <p className="text-violet-500/80 font-medium text-sm">{user.xp >= 500 ? 'Sustainability Champion' : 'Eco Explorer'}</p>
              </div>

              <div className="relative flex justify-end -mt-4 mb-2">
                 <div className="w-16 h-16 bg-white rounded-full p-1 shadow-sm flex items-center justify-center border-4 border-violet-100 z-10">
                    <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-white">
                      <Leaf size={24} />
                    </div>
                 </div>
                 <div className="w-4 h-8 bg-violet-300 absolute -bottom-3 right-8 rounded-b-sm -z-10 skew-x-6"></div>
                 <div className="w-4 h-8 bg-violet-300 absolute -bottom-3 right-4 rounded-b-sm -z-10 -skew-x-6"></div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-semibold text-violet-700/70 mb-1.5">
                  <span>{user.xp} XP</span>
                  <span>500 XP</span>
                </div>
                <Progress value={(user.xp / 500) * 100} className="h-1.5 bg-violet-200 [&>div]:bg-violet-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
           {/* Footprint Breakdown */}
           <Card className="rounded-2xl shadow-sm border-neutral-100">
             <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-neutral-900">Footprint Breakdown</h3>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                   <div className="relative w-[160px] h-[160px] flex-shrink-0">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius={50} outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={"cell-" + index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-xl font-bold text-neutral-900">{carbonData.total}</span>
                       <span className="text-[10px] bg-clip-text text-neutral-400 font-medium">kg CO<sub className="font-normal text-[8px]">2</sub>e</span>
                     </div>
                   </div>

                   <div className="flex-1 w-full space-y-3">
                     {pieData.map((item, idx) => {
                       const Icon = CATEGORY_ICONS[item.name] || Leaf;
                       const percentage = Math.round((item.value / carbonData.total) * 100);
                       return (
                         <div key={item.name} className="flex items-center justify-between text-sm">
                           <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                               <Icon size={14} />
                             </div>
                             <span className="font-semibold text-neutral-700">{item.name}</span>
                           </div>
                           <div className="flex space-x-6 text-neutral-900">
                             <span className="font-bold w-8 text-right">{percentage}%</span>
                             <span className="text-neutral-500 w-12 text-right">{item.value} kg</span>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                </div>

                <div className="mt-6 text-center border-t border-neutral-100 pt-4">
                  <button 
                    onClick={() => navigate('/footprint')}
                    className="text-sm font-semibold text-neutral-600 hover:text-primary transition-colors flex items-center justify-center mx-auto space-x-1"
                  >
                    <span>View detailed analysis</span> <ChevronRight size={16} />
                  </button>
                </div>
             </CardContent>
           </Card>

           {/* Trend Chart */}
           <Card className="rounded-2xl shadow-sm border-neutral-100 font-sans">
             <CardContent className="p-6 font-sans">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-neutral-900 text-sm md:text-base">Footprint Trend</h3>
                   
                   <div className="relative">
                     <button 
                       onClick={() => setTrendFilterOpen(!trendFilterOpen)}
                       className="px-3 py-1.5 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer hover:bg-neutral-200 transition-all flex items-center space-x-1 border border-transparent hover:border-neutral-200"
                     >
                       <span>{trendTimeframe === '6 Months' ? '6 Months' : trendTimeframe}</span>
                       <ChevronRight size={12} className="transform rotate-90 inline ml-0.5" />
                     </button>
                     
                     {trendFilterOpen && (
                       <div className="absolute right-0 mt-1 bg-white border border-neutral-200 shadow-xl rounded-xl py-1 z-30 w-32 flex flex-col text-left">
                         {(['Day', 'Week', 'Month', '6 Months', 'Year'] as const).map(tf => (
                           <button
                             key={tf}
                             onClick={() => {
                               setTrendTimeframe(tf);
                               setTrendFilterOpen(false);
                             }}
                             className={`px-4 py-2 text-xs font-bold text-left transition-colors ${trendTimeframe === tf ? 'bg-green-50 text-emerald-600' : 'text-neutral-600 hover:bg-neutral-50'}`}
                           >
                             {tf}
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                </div>
                
                <div className="h-[180px] w-full mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dx={-10} domain={yDomain} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#22c55e' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-green-50 rounded-xl p-3 flex space-x-2 items-center text-sm">
                  <div className="text-green-600 font-bold">✓ Great job! 🎉</div>
                  <div className="text-green-800">Your efforts reduced {Math.max(0, (carbonData.history?.[0]?.value || 0) - carbonData.total)} kg CO₂e since you started.</div>
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Daily Habit Checklist */}
        <div className="mb-8">
           <div className="flex justify-between items-center mb-4">
             <div>
               <h3 className="text-lg font-bold text-neutral-900">Daily Habits</h3>
               <p className="text-sm text-neutral-500">Quickly log your consistent eco-actions</p>
             </div>
             <div className="flex gap-2">
               {user.streak && user.streak > 0 && (
                 <div className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full flex items-center">
                   🔥 {user.streak} Day Streak
                 </div>
               )}
               <div className="text-xs font-bold text-primary bg-green-50 px-3 py-1 rounded-full flex items-center">
                 {habits.filter(h => h.completed).length} / {habits.length} Done
               </div>
             </div>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
             {habits.map((habit) => (
               <div 
                 key={habit.id}
                 onClick={() => toggleHabit(habit.id)}
                 className={`group cursor-pointer rounded-2xl p-3 border transition-all duration-200 flex flex-col items-center justify-center space-y-2 ${
                   habit.completed 
                   ? 'bg-primary border-primary text-white shadow-md' 
                   : 'bg-white border-neutral-100 text-neutral-600 hover:border-primary/30 hover:bg-neutral-50'
                 }`}
               >
                 <div className={`text-2xl transition-transform duration-200 group-hover:scale-110 ${habit.completed ? 'filter brightness-125' : ''}`}>
                   {habit.icon}
                 </div>
                 <div className="flex items-center space-x-1.5">
                   {habit.completed && <Check size={12} className="text-white" />}
                   <span className={`text-[11px] font-bold text-center leading-tight ${habit.completed ? 'text-white' : 'text-neutral-700'}`}>
                     {habit.title}
                   </span>
                 </div>
               </div>
             ))}
             <HabitManager />
           </div>
        </div>

        {/* Top Actions */}
        <div className="mb-8">
           <div className="flex justify-between items-center mb-4">
             <div>
               <h3 className="text-lg font-bold text-neutral-900">Top Actions for You</h3>
               <p className="text-sm text-neutral-500">Personalized actions with the highest impact</p>
             </div>
             <button className="px-4 py-1.5 border border-neutral-200 rounded-full text-sm font-semibold hover:bg-neutral-50 transition-colors">
               View All
             </button>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
             {actions.slice(0, 4).map(action => {
                const Icon = CATEGORY_ICONS[action.category] || Leaf;
                const tagColor = action.impact === 'High' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                
                return (
                  <ActionModal key={action.id} action={action} trigger={
                    <Card className="rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                            <Icon size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-neutral-900 truncate pr-2">{action.title}</h4>
                            <p className="text-[11px] text-neutral-500 font-medium">Save {action.carbonReduction} kg CO₂e / month</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 border-t border-neutral-50 pt-4">
                          <div className="flex space-x-2">
                             <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold " + tagColor}>{action.impact} Impact</span>
                             <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold border border-green-100/50">{action.difficulty}</span>
                          </div>
                          <ChevronRight size={16} className="text-neutral-400" />
                        </div>
                      </CardContent>
                    </Card>
                  } />
                )
             })}
           </div>
        </div>

        {/* Simulator Ad */}
        <div className="mb-0">
          <div className="bg-[#0f2e20] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border-b-4 border-green-700/50 mt-4">
            <svg className="absolute -right-4 -top-4 w-48 h-48 md:w-64 md:h-64 text-green-800 opacity-50" viewBox="0 0 100 100" fill="currentColor">
               <circle cx="50" cy="50" r="50" />
            </svg>
            <div className="relative z-10">
              <h4 className="text-xl font-bold mb-2">What-If Simulator</h4>
              <p className="text-sm text-green-100/80 max-w-[350px] mb-6 leading-relaxed">See the impact of your choices before you make them. Test different scenarios and optimize your footprint.</p>
              <button 
                onClick={() => navigate('/simulator')} 
                className="inline-flex items-center space-x-2 bg-white text-[#0f2e20] px-5 py-2.5 rounded-full text-sm font-bold hover:bg-green-50 transition-colors"
                title="Try Simulator"
              >
                <span>Try Simulator</span>
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="absolute right-2 md:right-12 bottom-0 text-7xl md:text-8xl translate-y-2 translate-x-2">
              🌍
            </div>
            <div className="absolute right-20 md:right-32 top-6 text-3xl md:text-4xl">
               ☁️
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
