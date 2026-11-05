import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

import { API_BASE } from "@/config";

export function CompanyPulse() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = () => {
      fetch(`${API_BASE}/hr/leaderboard/`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then((res) => res.json())
        .then((data) => {
          setLeaderboard(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load leaderboard", err);
          setLoading(false);
        });
    };
    
    fetchLeaderboard();
    
    window.addEventListener('tasks-updated', fetchLeaderboard);
    return () => window.removeEventListener('tasks-updated', fetchLeaderboard);
  }, [token]);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Syncing pulse...</div>;

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6 w-full max-w-full mx-auto pb-12 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 min-h-screen px-4 sm:px-8 lg:px-12 pt-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      {/* HEADER SECTION - Top Left Aligned */}
      <div className="flex flex-col items-start text-left space-y-1.5 pb-2 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-xl shadow-md shadow-blue-500/20 transform hover:scale-105 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 tracking-tight">
            Company Pulse
          </h1>
        </div>
        <p className="text-slate-500 text-sm md:text-base font-medium max-w-full">
          Recognizing the top performers driving our projects forward. Complete tasks to earn points, level up, and climb the ranks.
        </p>
      </div>

      {/* TOP 3 PODIUM - Scaled compact to keep clear breathing room below header */}
      {topThree.length > 0 && (
        <div className="flex flex-row items-end justify-center gap-4 md:gap-8 mt-4 pt-10 pb-6 mb-8 h-56 relative z-10 max-w-4xl mx-auto w-full">
          
          {/* 2ND PLACE (SILVER) */}
          <div className="w-[30%] max-w-[220px] flex flex-col items-center relative h-[145px] bg-gradient-to-b from-white to-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 animate-in slide-in-from-bottom-12 duration-700 delay-150 hover:-translate-y-2 transition-all group">
            {topThree[1] && (
              <>
                <div className="absolute -top-8 group-hover:-translate-y-1 transition-transform duration-300">
                  <div className="absolute inset-0 bg-slate-300 rounded-full blur-md opacity-50" />
                  <Avatar className="w-16 h-16 border-[3px] border-white shadow-md bg-white relative">
                    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-bold text-lg">{topThree[1].initials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm z-10">2</div>
                </div>
                <div className="mt-10 text-center flex flex-col items-center w-full px-3">
                  <p className="font-bold text-slate-900 text-base line-clamp-1">{topThree[1].name}</p>
                  <Badge className="bg-slate-200 hover:bg-slate-300 text-slate-700 mt-1 border-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest shadow-sm">Lvl {topThree[1].level}</Badge>
                  <p className="text-sm font-black text-slate-600 mt-2.5">{topThree[1].points} pts</p>
                </div>
              </>
            )}
          </div>

          {/* 1ST PLACE (GOLD) */}
          <div className="w-[35%] max-w-[250px] flex flex-col items-center relative h-[175px] bg-gradient-to-b from-amber-50 to-orange-100 rounded-2xl shadow-[0_8px_30px_rgb(251,146,60,0.2)] border border-amber-200/60 z-20 animate-in slide-in-from-bottom-16 duration-700 hover:-translate-y-2 transition-all group">
            <div className="absolute -top-12 -z-10 w-28 h-28 bg-amber-400/20 rounded-full blur-xl" />
            {topThree[0] && (
              <>
                <div className="absolute -top-10 group-hover:-translate-y-1 transition-transform duration-300">
                  <div className="absolute inset-0 bg-amber-400 rounded-full blur-md opacity-60 animate-pulse" />
                  <Avatar className="w-20 h-20 border-[4px] border-white shadow-lg bg-white relative">
                    <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-200 text-orange-600 font-black text-2xl">{topThree[0].initials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-300 to-amber-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-md z-10">1</div>
                </div>
                <div className="mt-12 text-center flex flex-col items-center w-full px-4">
                  <p className="font-black text-slate-900 text-lg line-clamp-1">{topThree[0].name}</p>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white mt-1 border-0 rounded-full px-3 py-0.5 text-[10px] uppercase font-black tracking-widest shadow-md">Level {topThree[0].level}</Badge>
                  <p className="text-lg font-black text-orange-600 mt-2.5 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" /> {topThree[0].points} pts
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 3RD PLACE (BRONZE) */}
          <div className="w-[30%] max-w-[220px] flex flex-col items-center relative h-[130px] bg-gradient-to-b from-white to-orange-50/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-100 animate-in slide-in-from-bottom-8 duration-700 delay-300 hover:-translate-y-2 transition-all group">
            {topThree[2] && (
              <>
                <div className="absolute -top-8 group-hover:-translate-y-1 transition-transform duration-300">
                  <div className="absolute inset-0 bg-orange-300 rounded-full blur-md opacity-40" />
                  <Avatar className="w-16 h-16 border-[3px] border-white shadow-md bg-white relative">
                    <AvatarFallback className="bg-gradient-to-br from-orange-50 to-red-50 text-orange-700 font-bold text-lg">{topThree[2].initials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-orange-200 text-orange-800 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm z-10">3</div>
                </div>
                <div className="mt-10 text-center flex flex-col items-center w-full px-3">
                  <p className="font-bold text-slate-900 text-base line-clamp-1">{topThree[2].name}</p>
                  <Badge className="bg-orange-100 hover:bg-orange-200 text-orange-800 mt-1 border-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest shadow-sm">Lvl {topThree[2].level}</Badge>
                  <p className="text-sm font-black text-orange-700 mt-2.5">{topThree[2].points} pts</p>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* THE REST OF THE LEADERBOARD */}
      <Card className="max-w-7xl mx-auto w-full shadow-xl shadow-slate-200/50 border-0 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 relative z-10">
        <CardHeader className="border-b border-slate-100/50 bg-white/50 py-6 px-8">
          <CardTitle className="text-xl flex items-center gap-3 text-slate-800 font-black">
            <TrendingUp className="w-6 h-6 text-blue-600" /> Current Standings
          </CardTitle>
          <CardDescription className="text-slate-500 text-sm mt-1.5 font-medium">Keep completing tasks to climb the ranks!</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100/80">
            {rest.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-5 px-8 hover:bg-slate-50/80 transition-all duration-300 group">
                <div className="flex items-center gap-5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shadow-inner group-hover:bg-white group-hover:shadow-sm group-hover:text-blue-600 transition-all">
                    {index + 4}
                  </div>
                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                    <AvatarFallback className="bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 font-bold text-sm">{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="font-bold text-slate-800 text-base leading-tight group-hover:text-blue-700 transition-colors">{user.name}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{user.role || 'Team Member'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right flex items-baseline gap-1.5 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50 group-hover:bg-blue-100/50 transition-colors">
                    <p className="font-black text-blue-600 text-lg">{user.points}</p>
                    <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">pts</span>
                  </div>
                  <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 font-bold text-[11px] px-3 py-1 rounded-full shadow-sm group-hover:border-blue-200 group-hover:text-blue-700 transition-colors uppercase tracking-wider">
                    Level {user.level}
                  </Badge>
                </div>
              </div>
            ))}
            {rest.length === 0 && topThree.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                <div className="inline-flex p-4 rounded-full bg-slate-50 mb-3">
                  <Trophy className="w-8 h-8 text-slate-300" />
                </div>
                <p>No data available yet. Start completing tasks to dominate the board!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
