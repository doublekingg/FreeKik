import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { LeaderboardEntry } from './src/types/game';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-Memory persistent Leaderboard storage with authentic initial champions
let leaderboard: LeaderboardEntry[] = [
  {
    id: 'lb_1',
    rank: 1,
    playerName: 'David_Beckham_7',
    score: 18450,
    level: 8,
    accuracy: 94,
    streak: 12,
    curveStyle: 'Vòng Cung Chuối',
    date: '2026-10-19',
    avatarSeed: 'beckham',
    badge: '👑 Vua Đá Phạt',
  },
  {
    id: 'lb_2',
    rank: 2,
    playerName: 'Roberto_Carlos_3',
    score: 16900,
    level: 8,
    accuracy: 89,
    streak: 9,
    curveStyle: 'Sấm Sét Má Ngoài Trivela',
    date: '2026-10-18',
    avatarSeed: 'carlos',
    badge: '⚡ Thần Lực',
  },
  {
    id: 'lb_3',
    rank: 3,
    playerName: 'Juninho_Knuckle',
    score: 15300,
    level: 7,
    accuracy: 91,
    streak: 8,
    curveStyle: 'Lá Bàng Rơi Topspin',
    date: '2026-10-19',
    avatarSeed: 'juninho',
    badge: '🎯 Xạ Thủ Góc Chết',
  },
  {
    id: 'lb_4',
    rank: 4,
    playerName: 'NguyenQuangHai_19',
    score: 14200,
    level: 7,
    accuracy: 88,
    streak: 7,
    curveStyle: 'Cầu Vồng Tuyết',
    date: '2026-10-20',
    avatarSeed: 'hai',
    badge: '🌟 Ngôi Sao Châu Á',
  },
  {
    id: 'lb_5',
    rank: 5,
    playerName: 'Leo_Messi_10',
    score: 13850,
    level: 6,
    accuracy: 92,
    streak: 8,
    curveStyle: 'Lòng Trong Hiểm Hóc',
    date: '2026-10-20',
    avatarSeed: 'messi',
    badge: '🐐 Huyền Thoại',
  },
  {
    id: 'lb_6',
    rank: 6,
    playerName: 'Cristiano_CR7',
    score: 13100,
    level: 6,
    accuracy: 86,
    streak: 6,
    curveStyle: 'Tomahawk Cắm Góc',
    date: '2026-10-20',
    avatarSeed: 'cr7',
    badge: '🔥 Chiến Binh',
  },
  {
    id: 'lb_7',
    rank: 7,
    playerName: 'Son_HeungMin_7',
    score: 11950,
    level: 5,
    accuracy: 84,
    streak: 5,
    curveStyle: 'Xoáy Má Trong Góc Cao',
    date: '2026-10-19',
    avatarSeed: 'sonny',
    badge: '⚡ Pháo Thủ',
  },
  {
    id: 'lb_8',
    rank: 8,
    playerName: 'MinhTuan_FreeKick',
    score: 10400,
    level: 5,
    accuracy: 80,
    streak: 4,
    curveStyle: 'Vòng Cung Chuối',
    date: '2026-10-20',
    avatarSeed: 'tuan',
    badge: '🎖️ Cao Thủ Sút Phạt',
  },
];

// Helper to recalculate ranks
function updateRanks() {
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });
}

// 1. GET /api/leaderboard - Online Leaderboard
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const filter = (req.query.filter as string) || 'all';
  updateRanks();

  let results = [...leaderboard];
  if (filter === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    results = results.filter((entry) => entry.date === today || entry.rank! <= 3);
  }

  res.json({
    success: true,
    totalPlayers: results.length,
    leaderboard: results.slice(0, 50),
  });
});

// 2. POST /api/leaderboard - Submit new score
app.post('/api/leaderboard', (req: Request, res: Response) => {
  try {
    const { playerName, score, level, accuracy, streak, curveStyle } = req.body;

    if (!playerName || typeof score !== 'number') {
      res.status(400).json({ success: false, error: 'Invalid score or player name' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const existingIndex = leaderboard.findIndex(
      (entry) => entry.playerName.toLowerCase() === playerName.trim().toLowerCase()
    );

    let entry: LeaderboardEntry;
    if (existingIndex >= 0) {
      if (score > leaderboard[existingIndex].score) {
        leaderboard[existingIndex].score = score;
        leaderboard[existingIndex].level = Math.max(leaderboard[existingIndex].level, level || 1);
        leaderboard[existingIndex].accuracy = accuracy || leaderboard[existingIndex].accuracy;
        leaderboard[existingIndex].streak = Math.max(leaderboard[existingIndex].streak, streak || 1);
        leaderboard[existingIndex].date = today;
      }
      entry = leaderboard[existingIndex];
    } else {
      entry = {
        id: `lb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerName: playerName.trim().substring(0, 20),
        score,
        level: level || 1,
        accuracy: accuracy || 75,
        streak: streak || 1,
        curveStyle: curveStyle || 'Vòng Cung Chuối',
        date: today,
        avatarSeed: playerName.trim().toLowerCase(),
        badge: score > 15000 ? '👑 Huyền Thoại' : score > 8000 ? '⭐ Cao Thủ' : '⚽ Tân Binh Xuất Sắc',
        isCurrentUser: true,
      };
      leaderboard.push(entry);
    }

    updateRanks();
    res.json({
      success: true,
      rank: entry.rank,
      leaderboard: leaderboard.slice(0, 50),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 3. GET /api/daily - Daily streak info
app.get('/api/daily', (req: Request, res: Response) => {
  res.json({
    success: true,
    serverDate: new Date().toISOString().slice(0, 10),
    luckySpinPrizes: [
      { id: 'p1', label: '100 Xu', type: 'coins', value: 100, color: '#3b82f6' },
      { id: 'p2', label: '250 Xu', type: 'coins', value: 250, color: '#10b981' },
      { id: 'p3', label: '500 Xu', type: 'coins', value: 500, color: '#f59e0b' },
      { id: 'p4', label: 'Bóng Độc Quyền', type: 'ball', value: 'inferno', color: '#ef4444' },
      { id: 'p5', label: '1000 Xu JACKPOT', type: 'coins', value: 1000, color: '#8b5cf6' },
      { id: 'p6', label: 'X2 Điểm Trận Kế', type: 'buff', value: 'x2_multiplier', color: '#ec4899' },
    ],
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
