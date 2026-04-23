const express = require('express');
const path = require('path'); // ← NEW: For serving HTML files
const app = express();
app.use(express.json());

// ============================================
// MOCK DATABASE (stored in memory for testing)
// ============================================
let users = [];
let watchlist = [];
let watched = [];
let ratings = [];
let nextId = 1;

// ============================================
// MIDDLEWARE (Fixed: Skip authentication for web pages)
// ============================================
app.use((req, res, next) => {
    // NEW: Skip authentication for these paths (they are web pages, not API)
    const publicPaths = ['/dashboard', '/', '/login', '/register', '/home'];
    if (publicPaths.includes(req.path)) {
        return next();  // Allow access without token
    }
    
    // For API endpoints, require authentication
    const authHeader = req.headers.authorization;
    
    // For testing: Accept ANY token that starts with "Bearer "
    if (authHeader && authHeader.startsWith('Bearer ')) {
        req.user = { id: 1, username: 'testuser' };
        return next();
    }
    
    // For login and register, no token needed
    if (req.path === '/api/login' || req.path === '/api/register') {
        return next();
    }
    
    // For all other API routes, require authentication
    res.status(401).json({ error: 'Authentication required' });
});

// ============================================
// NEW: Serve Dashboard HTML Page
// ============================================
app.get('/dashboard', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MovieWatch+ Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: #1a1a2e; color: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 15px; border-radius: 8px; flex: 1; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .movie-grid { display: flex; gap: 15px; flex-wrap: wrap; }
        .movie-card { background: white; padding: 10px; border-radius: 8px; width: 150px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .poster { width: 100%; height: 200px; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 48px; border-radius: 4px; }
        nav a { color: white; text-decoration: none; margin-right: 20px; }
        nav a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎬 MovieWatch+</h1>
        <nav>
            <a href="/dashboard">Dashboard</a>
            <a href="#">Watchlist</a>
            <a href="#">Watched</a>
            <a href="#">Recommendations</a>
            <a href="#">Profile</a>
            <a href="#">Logout</a>
        </nav>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <h3>📋 Watchlist</h3>
            <p>5 movies</p>
        </div>
        <div class="stat-card">
            <h3>✅ Watched</h3>
            <p>12 movies</p>
        </div>
        <div class="stat-card">
            <h3>⭐ Avg Rating</h3>
            <p>4.2 / 5</p>
        </div>
    </div>
    
    <h2>🎯 Recommended for You</h2>
    <div class="movie-grid">
        <div class="movie-card"><div class="poster">🎬</div><h4>Inception</h4><p>2010 ⭐8.8</p></div>
        <div class="movie-card"><div class="poster">🚀</div><h4>Interstellar</h4><p>2014 ⭐8.6</p></div>
        <div class="movie-card"><div class="poster">🦇</div><h4>The Dark Knight</h4><p>2008 ⭐9.0</p></div>
        <div class="movie-card"><div class="poster">🔄</div><h4>Memento</h4><p>2000 ⭐8.4</p></div>
    </div>
    
    <p style="margin-top: 20px; color: green; text-align: center;">✅ Dashboard loaded successfully!</p>
</body>
</html>
    `);
});

// ============================================
// ST-01 & ST-02: REGISTER
// ============================================
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
    }
    
    const newUser = { id: nextId++, username, password };
    users.push(newUser);
    
    res.status(201).json({ message: 'User created successfully', username });
});

// ============================================
// ST-03: LOGIN
// ============================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.json({ token: 'fake-jwt-token-123', message: 'Login successful', username });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// ============================================
// ST-04: SEARCH MOVIES
// ============================================
app.get('/api/movies/search', (req, res) => {
    const { q } = req.query;
    
    if (q && q.toLowerCase() === 'inception') {
        res.json({
            results: [
                { id: 123, title: 'Inception', year: 2010, rating: 8.8 },
                { id: 456, title: 'Inception: The IMAX Experience', year: 2010, rating: 8.7 }
            ]
        });
    } else {
        res.json({ results: [] });
    }
});

// ============================================
// ST-05: ADD TO WATCHLIST
// ============================================
app.post('/api/watchlist', (req, res) => {
    const { movieId, movieTitle } = req.body;
    const userId = req.user.id;
    
    if (!movieId) {
        return res.status(400).json({ error: 'movieId required' });
    }
    
    const exists = watchlist.some(w => w.userId === userId && w.movieId === movieId);
    if (exists) {
        return res.status(400).json({ error: 'Movie already in watchlist' });
    }
    
    const newEntry = {
        id: watchlist.length + 1,
        userId: userId,
        movieId: movieId,
        movieTitle: movieTitle || 'Unknown',
        dateAdded: new Date().toISOString()
    };
    watchlist.push(newEntry);
    
    res.status(200).json({ 
        message: 'Movie added to watchlist', 
        watchlistId: newEntry.id 
    });
});

// ============================================
// ST-06: MARK AS WATCHED
// ============================================
app.post('/api/watched', (req, res) => {
    const { movieId, movieTitle, dateWatched } = req.body;
    const userId = req.user.id;
    
    if (!movieId) {
        return res.status(400).json({ error: 'movieId required' });
    }
    
    const watchlistIndex = watchlist.findIndex(w => w.userId === userId && w.movieId === movieId);
    if (watchlistIndex !== -1) {
        watchlist.splice(watchlistIndex, 1);
    }
    
    const alreadyWatched = watched.some(w => w.userId === userId && w.movieId === movieId);
    if (alreadyWatched) {
        return res.status(400).json({ error: 'Movie already marked as watched' });
    }
    
    const newWatched = {
        id: watched.length + 1,
        userId: userId,
        movieId: movieId,
        movieTitle: movieTitle || 'Unknown',
        dateWatched: dateWatched || new Date().toISOString().split('T')[0]
    };
    watched.push(newWatched);
    
    res.status(200).json({ 
        message: 'Movie marked as watched', 
        watchedId: newWatched.id 
    });
});

// ============================================
// ST-07: RATE A MOVIE
// ============================================
app.post('/api/ratings', (req, res) => {
    const { movieId, rating, review } = req.body;
    const userId = req.user.id;
    
    if (!movieId) {
        return res.status(400).json({ error: 'movieId required' });
    }
    
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const isWatched = watched.some(w => w.userId === userId && w.movieId === movieId);
    if (!isWatched) {
        return res.status(400).json({ error: 'Movie must be marked as watched before rating' });
    }
    
    const existingRatingIndex = ratings.findIndex(r => r.userId === userId && r.movieId === movieId);
    if (existingRatingIndex !== -1) {
        ratings[existingRatingIndex] = { ...ratings[existingRatingIndex], rating, review };
        return res.status(200).json({ message: 'Rating updated successfully' });
    }
    
    const newRating = {
        id: ratings.length + 1,
        userId: userId,
        movieId: movieId,
        rating: rating,
        review: review || '',
        dateRated: new Date().toISOString()
    };
    ratings.push(newRating);
    
    const movieRatings = ratings.filter(r => r.movieId === movieId);
    const avgRating = movieRatings.reduce((sum, r) => sum + r.rating, 0) / movieRatings.length;
    
    res.status(200).json({ 
        message: 'Rating saved successfully', 
        averageRating: parseFloat(avgRating.toFixed(1))
    });
});

// ============================================
// ST-08: GET RECOMMENDATIONS
// ============================================
app.get('/api/recommendations', (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const userWatched = watched.filter(w => w.userId === userId);
    
    if (userWatched.length < 3) {
        return res.status(200).json({
            message: 'Watch at least 3 movies to get recommendations',
            recommendations: []
        });
    }
    
    const mockRecommendations = [
        { movieId: 789, title: 'The Dark Knight', year: 2008, score: 0.95 },
        { movieId: 101, title: 'Interstellar', year: 2014, score: 0.92 },
        { movieId: 202, title: 'Memento', year: 2000, score: 0.88 }
    ];
    
    res.json({ recommendations: mockRecommendations.slice(0, limit) });
});

// ============================================
// ST-09: LOGOUT
// ============================================
app.post('/api/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// ============================================
// HELPER: Get watchlist
// ============================================
app.get('/api/watchlist', (req, res) => {
    const userId = req.user.id;
    const userWatchlist = watchlist.filter(w => w.userId === userId);
    res.json({ watchlist: userWatchlist });
});

// ============================================
// START SERVER
// ============================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Endpoints available:');
    console.log('  GET    /dashboard              ← Web page (no auth required)');
    console.log('  POST   /api/register');
    console.log('  POST   /api/login');
    console.log('  GET    /api/movies/search?q=inception');
    console.log('  POST   /api/watchlist');
    console.log('  POST   /api/watched');
    console.log('  POST   /api/ratings');
    console.log('  GET    /api/recommendations');
    console.log('  POST   /api/logout');
    console.log('  GET    /api/watchlist');
});