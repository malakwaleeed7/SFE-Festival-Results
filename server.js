const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'festival-secret-2025';
const ACCESS_CODE = process.env.ACCESS_CODE || '1911';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Data storage
const DATA_FILE = './data.json';

const defaultData = {
    games: [
        { id: 'acting', name: 'Acting', icon: '🎭', type: 'individual' },
        { id: 'arm_wrestling', name: 'Arm Wrestling', icon: '💪', type: 'individual' },
        { id: 'billiards', name: 'Billiards', icon: '🎱', type: 'individual' },
        { id: 'chess', name: 'Chess', icon: '♟️', type: 'individual' },
        { id: 'drawing', name: 'Drawing', icon: '🎨', type: 'individual' },
        { id: 'fitness', name: 'Fitness', icon: '🏋️', type: 'individual' },
        { id: 'football', name: 'Football', icon: '⚽', type: 'team' },
        { id: 'handcrafting', name: 'Hand Crafting', icon: '✂️', type: 'individual' },
        { id: 'music', name: 'Music Performance', icon: '🎹', type: 'individual' },
        { id: 'nasheed', name: 'Religious Chanting', icon: '🎵', type: 'individual' },
        { id: 'playstation', name: 'PlayStation', icon: '🎮', type: 'individual' },
        { id: 'poetry', name: 'Poetry', icon: '📝', type: 'individual' },
        { id: 'quran_memorization', name: 'Quran Memorization', icon: '📖', type: 'individual' },
        { id: 'quran_recitation', name: 'Quran Recitation', icon: '🕌', type: 'individual' },
        { id: 'quiz', name: 'Quiz Competition', icon: '🧠', type: 'individual' },
        { id: 'running', name: 'Running', icon: '🏃', type: 'individual' },
        { id: 'singing', name: 'Singing', icon: '🎤', type: 'individual' },
        { id: 'table_tennis', name: 'Table Tennis', icon: '🏓', type: 'individual' },
        { id: 'tug_of_war', name: 'Tug of War', icon: '🪢', type: 'team' }
    ],
    faculties: [
        'Agriculture', 'Archaeology', 'Arts', 'Arts & Humanities', 'Commerce',
        'Computer Science', 'Computers & IT', 'Dentistry', 'Education',
        'Engineering', 'Girls College', 'Home Economics', 'Law',
        'Mass Communication', 'Medicine', 'Nursing', 'Pharmacy',
        'Science', 'Technical Education', 'Veterinary Medicine'
    ],
    results: []
};

const loadData = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Load error:', e);
    }
    return { ...defaultData };
};

const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

let data = loadData();
if (!data.games) {
    data = { ...defaultData };
    saveData(data);
}

// Auth middleware
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Routes
app.post('/api/login', (req, res) => {
    if (req.body.code !== ACCESS_CODE) {
        return res.status(401).json({ error: 'Invalid code' });
    }
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { role: 'admin' } });
});

app.get('/api/me', auth, (req, res) => {
    res.json({ role: 'admin' });
});

app.get('/api/games', (req, res) => {
    res.json(data.games.sort((a, b) => a.name.localeCompare(b.name)));
});

app.get('/api/faculties', (req, res) => {
    res.json(data.faculties.sort());
});

app.get('/api/results', (req, res) => {
    const results = data.results.map(r => {
        const game = data.games.find(g => g.id === r.game_id);
        return { ...r, game_name: game?.name, game_icon: game?.icon, game_type: game?.type };
    }).sort((a, b) => (a.game_name || '').localeCompare(b.game_name || '') || a.position - b.position);
    res.json(results);
});

app.post('/api/results', auth, (req, res) => {
    const { game_id, position, participant_name, faculty, team_players } = req.body;
    if (!game_id || !position || !faculty) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    
    data.results = data.results.filter(r => !(r.game_id === game_id && r.position === parseInt(position)));
    data.results.push({
        id: Date.now(),
        game_id,
        position: parseInt(position),
        participant_name,
        faculty,
        team_players,
        created_at: new Date().toISOString()
    });
    saveData(data);
    res.json({ success: true });
});

app.delete('/api/results/:gameId/:position', auth, (req, res) => {
    data.results = data.results.filter(r => !(r.game_id === req.params.gameId && r.position === parseInt(req.params.position)));
    saveData(data);
    res.json({ success: true });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
