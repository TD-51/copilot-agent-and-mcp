const request = require('supertest');
const express = require('express');
const createApiRouter = require('../routes');
const path = require('path');

const app = express();
app.use(express.json());
app.use('/api', createApiRouter({
  usersFile: path.join(__dirname, '../data/test-users.json'),
  booksFile: path.join(__dirname, '../data/test-books.json'),
  readJSON: (file) => require('fs').existsSync(file) ? JSON.parse(require('fs').readFileSync(file, 'utf-8')) : [],
  writeJSON: (file, data) => require('fs').writeFileSync(file, JSON.stringify(data, null, 2)),
  authenticateToken: (req, res, next) => next(), // No auth for books
  SECRET_KEY: 'test_secret',
}));

describe('Books API', () => {
  it('GET /api/books should return a list of books', async () => {
    const res = await request(app).get('/api/books');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/books should not be allowed', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: 'Test Book', author: 'Test Author' });
    expect([404, 405]).toContain(res.statusCode);
  });

  it.each([
    ['title', 'asc'], ['title', 'desc'],
    ['author', 'asc'], ['author', 'desc'],
  ])('sorts by %s in %s order without changing stored order', async (sort, order) => {
    const original = await request(app).get('/api/books');
    const res = await request(app).get('/api/books').query({ sort, order });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([...original.body].sort((a, b) =>
      a[sort].localeCompare(b[sort], 'en', { sensitivity: 'base' }) *
      (order === 'desc' ? -1 : 1)));
    expect((await request(app).get('/api/books')).body).toEqual(original.body);
  });

  it('defaults to ascending when a sort field is supplied', async () => {
    const res = await request(app).get('/api/books?sort=title');
    const explicit = await request(app).get('/api/books?sort=title&order=asc');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(explicit.body);
  });

  it.each([
    'sort=genre', 'sort=__proto__', 'sort=', 'order=sideways',
    'sort=title&sort=author', 'order=asc&order=desc',
  ])('rejects invalid sorting parameters: %s', async query => {
    const res = await request(app).get(`/api/books?${query}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid sort field or order.' });
  });
});

describe('Books sorting with controlled data', () => {
  const books = [
    { id: '1', title: 'zebra', author: 'Ada' },
    { id: '2', title: 'Apple', author: 'zoe' },
    { id: '3', title: 'apple', author: 'Ada' },
  ];
  const readJSON = jest.fn();
  const isolatedApp = express();
  isolatedApp.use('/books', require('../routes/books')({ readJSON }));

  beforeEach(() => readJSON.mockReturnValue(books));

  it('ignores case and preserves the order of equal titles', async () => {
    const res = await request(isolatedApp).get('/books?sort=title');
    expect(res.body.map(book => book.id)).toEqual(['2', '3', '1']);
    expect(books.map(book => book.id)).toEqual(['1', '2', '3']);
  });

  it('preserves the order of equal authors', async () => {
    const res = await request(isolatedApp).get('/books?sort=author&order=desc');
    expect(res.body.map(book => book.id)).toEqual(['2', '1', '3']);
  });

  it('sorts an empty list', async () => {
    readJSON.mockReturnValue([]);
    const res = await request(isolatedApp).get('/books?sort=title');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });
});
