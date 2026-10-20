const express = require('express');

function createBooksRouter({ booksFile, readJSON, writeJSON, authenticateToken }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { sort, order = 'asc' } = req.query;
    if ((sort !== undefined && !['title', 'author'].includes(sort)) ||
        !['asc', 'desc'].includes(order)) {
      return res.status(400).json({ error: 'Invalid sort field or order.' });
    }
    const books = readJSON(booksFile);
    const sortedBooks = sort
      ? [...books].sort((a, b) =>
        a[sort].localeCompare(b[sort], 'en', { sensitivity: 'base' }) *
        (order === 'desc' ? -1 : 1))
      : books;
    res.json(sortedBooks);
  });

  // POST /books removed: adding books is not allowed

  return router;
}

module.exports = createBooksRouter;
