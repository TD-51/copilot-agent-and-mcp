const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;

function createFavoritesRouter({
  usersFile,
  booksFile,
  readJSON,
  writeJSON,
  authenticateToken,
  favoritesRateLimitOptions,
}) {
  const rateLimitOptions = favoritesRateLimitOptions || {
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  };
  const router = express.Router();

  router.use(rateLimit(rateLimitOptions));
  router.use(authenticateToken);

  router.get('/', (req, res) => {
    const users = readJSON(usersFile);
    const user = users.find(u => u.username === req.user.username);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const books = readJSON(booksFile);
    const favorites = books.filter(b => user.favorites.indexOf(b.id) !== -1);
    res.json(favorites);
  });

  router.post('/', (req, res) => {
    const { bookId } = req.body;
    if (!bookId) return res.status(400).json({ message: 'Book ID required' });
    const users = readJSON(usersFile);
    const user = users.find(u => u.username === req.user.username);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.favorites.indexOf(bookId) == -1) {
      user.favorites.push(bookId);
      writeJSON(usersFile, users);
    }
    res.status(200).json({ message: 'Book added to favorites' });
  });

  router.delete('/', (req, res) => {
    try {
      const users = readJSON(usersFile);
      const user = users.find(u => u.username === req.user.username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      user.favorites = [];
      writeJSON(usersFile, users);
      res.status(200).json({ message: 'All favorites cleared' });
    } catch (err) {
      res.status(500).json({ message: 'Failed to clear favorites' });
    }
  });

  return router;
}

module.exports = createFavoritesRouter;
