import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '../components/ui/card';
import { Trophy, Medal, User, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardUser {
  uid: string;
  name: string;
  photoURL?: string;
  level: number;
  ecoPoints: number;
}

export const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(collection(db, 'leaderboard'), orderBy('ecoPoints', 'desc'), limit(50));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data() as LeaderboardUser);
        setUsers(data);
      } catch (error) {
        console.error("Error fetching leaderboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading leaderboard...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight italic">Global <span className="text-primary not-italic">Leaderboard</span></h1>
        <p className="text-neutral-500 font-medium">Top sustainability champions this month</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {users.slice(0, 3).map((user, idx) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={`text-center p-6 border-0 shadow-lg ${idx === 0 ? 'bg-amber-50 scale-105 border-amber-200' : idx === 1 ? 'bg-slate-50' : 'bg-orange-50'}`}>
              <CardContent className="p-0 space-y-4">
                <div className="relative inline-block">
                  {user.photoURL ? (
                    <img src={user.photoURL} className="w-20 h-20 rounded-full border-4 border-white shadow-md mx-auto" alt="" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-md mx-auto text-neutral-400">
                      <User size={32} />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    {idx === 0 ? <Trophy className="text-amber-500 fill-amber-500" size={16} /> : <Medal className={idx === 1 ? 'text-slate-400 fill-slate-400' : 'text-orange-400 fill-orange-400'} size={16} />}
                  </div>
                </div>
                <div>
                   <h3 className="font-bold text-neutral-900 truncate">{user.name}</h3>
                   <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Level {user.level}</p>
                </div>
                <div className="bg-white/50 rounded-2xl py-2 px-4 inline-block">
                   <span className="text-xl font-black text-neutral-900">{user.ecoPoints.toLocaleString()}</span>
                   <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">pts</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden">
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-100 flex justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400">
          <span>Rank & User</span>
          <span>EcoPoints</span>
        </div>
        <div className="divide-y divide-neutral-100">
          {users.map((user, idx) => (
            <div key={user.uid} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
              <div className="flex items-center space-x-4">
                <span className={`w-6 text-sm font-black ${idx < 3 ? 'text-primary' : 'text-neutral-400'}`}>{idx + 1}</span>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200">
                   {user.photoURL ? <img src={user.photoURL} alt="" /> : <User className="p-2 text-neutral-400" />}
                </div>
                <div>
                   <p className="font-bold text-neutral-900 text-sm">{user.name}</p>
                   <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Level {user.level}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                   <p className="font-black text-neutral-900">{user.ecoPoints.toLocaleString()}</p>
                   <div className="flex items-center text-[10px] text-green-500 font-bold justify-end">
                      <TrendingUp size={10} className="mr-0.5" />
                      <span>+12%</span>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && <div className="p-8 text-center text-neutral-400">No entries yet. Be the first!</div>}
        </div>
      </Card>
    </div>
  );
};
