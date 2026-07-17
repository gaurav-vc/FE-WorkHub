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
  }, [token]);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Syncing pulse...</div>;

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 bg-[#f8fafc] min-h-screen px-4 pt-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="inline-flex items-center justify-center p-4 bg-blue-50 text-blue-500 rounded-full mb-1">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Company Pulse</h1>
        <p className="text-slate-500 max-w-lg text-[15px] leading-relaxed">
          Recognizing the top performers driving our projects forward.<br/>Complete tasks to earn points, level up, and climb the ranks.
        </p>
      </div>

      {/* TOP 3 PODIUM */}
      {topThree.length > 0 && (
        <div className="flex flex-row items-end justify-center gap-4 mt-20 mb-12 h-48">
          
          {/* 2ND PLACE */}
          <div className="w-[30%] max-w-[220px] flex flex-col items-center relative h-[140px] bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100">
            {topThree[1] && (
              <>
                <div className="absolute -top-10">
                  <Avatar className="w-20 h-20 border-[6px] border-[#f8fafc] shadow-sm bg-white">
                    <AvatarFallback className="bg-slate-50 text-slate-600 font-bold text-xl">{topThree[1].initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="mt-12 text-center flex flex-col items-center w-full px-2">
                  <Medal className="w-4 h-4 text-slate-400 mb-1" />
                  <p className="font-bold text-slate-900 text-sm line-clamp-1">{topThree[1].name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Lvl {topThree[1].level}</p>
                  <p className="text-sm font-semibold text-blue-600 mt-2">{topThree[1].points} pts</p>
                </div>
              </>
            )}
          </div>

          {/* 1ST PLACE */}
          <div className="w-[35%] max-w-[280px] flex flex-col items-center relative h-[170px] bg-gradient-to-b from-white to-orange-50/70 rounded-xl shadow-[0_4px_12px_-2px_rgba(251,146,60,0.15)] border border-orange-100 z-10">
            {topThree[0] && (
              <>
                <div className="absolute -top-12">
                  <Avatar className="w-24 h-24 border-[4px] border-orange-400 shadow-md bg-white">
                    <AvatarFallback className="bg-orange-50 text-orange-500 font-bold text-2xl">{topThree[0].initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="mt-14 text-center flex flex-col items-center w-full px-2">
                  <Trophy className="w-5 h-5 text-orange-500 mb-1" />
                  <p className="font-bold text-slate-900 text-[15px] line-clamp-1">{topThree[0].name}</p>
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white mt-1 border-0 rounded-full px-3 py-0 text-[10px] uppercase font-bold tracking-wider">Level {topThree[0].level}</Badge>
                  <p className="text-base font-bold text-orange-500 mt-2">{topThree[0].points} pts</p>
                </div>
              </>
            )}
          </div>

          {/* 3RD PLACE */}
          <div className="w-[30%] max-w-[220px] flex flex-col items-center relative h-[140px] bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100">
            {topThree[2] && (
              <>
                <div className="absolute -top-10">
                  <Avatar className="w-20 h-20 border-[6px] border-[#f8fafc] shadow-sm bg-white">
                    <AvatarFallback className="bg-slate-50 text-slate-600 font-bold text-xl">{topThree[2].initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="mt-12 text-center flex flex-col items-center w-full px-2">
                  <Medal className="w-4 h-4 text-slate-400 mb-1" />
                  <p className="font-bold text-slate-900 text-sm line-clamp-1">{topThree[2].name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Lvl {topThree[2].level}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-2">{topThree[2].points} pts</p>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* THE REST OF THE LEADERBOARD */}
      <Card className="max-w-4xl mx-auto shadow-sm border border-slate-200/60 rounded-xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-white py-5">
          <CardTitle className="text-[17px] flex items-center gap-2 text-slate-800 font-bold">
            <TrendingUp className="w-[18px] h-[18px] text-blue-600" /> Current Standings
          </CardTitle>
          <CardDescription className="text-slate-500 text-[13px] mt-1">Keep completing tasks to climb the ranks!</CardDescription>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <div className="divide-y divide-slate-100">
            {rest.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-4 px-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-5">
                  <div className="w-6 text-left font-semibold text-slate-400 text-sm">#{index + 4}</div>
                  <Avatar className="w-10 h-10 border-0">
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-[13px]">{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="font-bold text-slate-800 text-[14px] leading-tight">{user.name}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{user.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right flex items-baseline gap-1">
                    <p className="font-bold text-blue-600 text-[15px]">{user.points}</p>
                    <span className="text-[12px] text-slate-500 font-medium">pts</span>
                  </div>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-semibold text-[11px] px-2.5 py-0.5 rounded-md">
                    Level {user.level}
                  </Badge>
                </div>
              </div>
            ))}
            {rest.length === 0 && topThree.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                No data available yet. Start completing tasks!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
