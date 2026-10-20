import booksReducer, { fetchBooks, setSort } from '../../src/store/booksSlice';

const { describe, it, beforeEach, expect, cy, Cypress } = globalThis;

describe('Books sort state', () => {
  it('defaults to title ascending and stores a new selection', () => {
    const initial = booksReducer(undefined, { type: 'init' });
    expect(initial).to.include({ sort: 'title', order: 'asc' });
    const updated = booksReducer(initial, setSort({ sort: 'author', order: 'desc' }));
    expect(updated).to.include({ sort: 'author', order: 'desc' });
  });

  it('ignores stale successful and failed requests', () => {
    let state = booksReducer(undefined, fetchBooks.pending('old'));
    state = booksReducer(state, fetchBooks.pending('new'));
    state = booksReducer(state, fetchBooks.fulfilled([{ id: 'new' }], 'new'));
    const latest = state;
    state = booksReducer(state, fetchBooks.fulfilled([{ id: 'old' }], 'old'));
    state = booksReducer(state, fetchBooks.rejected(new Error('stale'), 'old'));
    expect(state).to.deep.equal(latest);
    expect(state.items).to.deep.equal([{ id: 'new' }]);
    expect(state.status).to.equal('succeeded');
  });

  it('requests the selected sort and rejects unsuccessful responses', async () => {
    const fetch = cy.stub(globalThis, 'fetch').resolves({ ok: false });
    const dispatch = cy.stub();
    const result = await fetchBooks()(dispatch, () => ({
      books: { sort: 'author', order: 'desc' },
    }), undefined);
    expect(fetch).to.have.been.calledWith(
      'http://localhost:4000/api/books?sort=author&order=desc',
    );
    expect(result.type).to.equal(fetchBooks.rejected.type);
  });
});

describe('Book sorting integration', () => {
  beforeEach(() => {
    const username = `sort-${Date.now()}-${Cypress._.random(1000000)}`;
    const password = 'sorting-test-password';
    cy.request('POST', 'http://localhost:4000/api/register', { username, password });
    cy.visit('http://localhost:5173/login');
    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);
    cy.get('button#login').click();
    cy.get('a#books-link').click();
  });

  const assertOrder = (field, order) => {
    cy.get(`[class*="book${field === 'title' ? 'Title' : 'Author'}"]`).should(elements => {
      const values = [...elements].map(element => element.textContent);
      const expected = [...values].sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' }) * (order === 'desc' ? -1 : 1));
      expect(values).to.deep.equal(expected);
    });
  };

  it('sorts by title and author in both directions using the API', () => {
    cy.get('#book-sort').should('have.value', 'title-asc');
    assertOrder('title', 'asc');
    for (const [sort, order] of [['title', 'desc'], ['author', 'asc'], ['author', 'desc'], ['title', 'asc']]) {
      cy.intercept('GET', `**/api/books?sort=${sort}&order=${order}`).as('sortedBooks');
      cy.get('#book-sort').select(`${sort}-${order}`);
      cy.wait('@sortedBooks').its('response.statusCode').should('be.oneOf', [200, 304]);
      assertOrder(sort, order);
    }
  });

  it('keeps the selection and displayed order after navigation and browser history', () => {
    cy.intercept('GET', '**/api/books?sort=author&order=desc').as('authorDescending');
    cy.get('#book-sort').select('author-desc');
    cy.wait('@authorDescending');
    assertOrder('author', 'desc');
    cy.get('a#favorites-link').click();
    cy.get('a#books-link').click();
    cy.wait('@authorDescending');
    cy.get('#book-sort').should('have.value', 'author-desc');
    assertOrder('author', 'desc');
    cy.go('back');
    cy.contains('h2', 'My Favorite Books').should('exist');
    cy.go('forward');
    cy.wait('@authorDescending');
    cy.get('#book-sort').should('have.value', 'author-desc');
    assertOrder('author', 'desc');
  });
});
