describe('Book Favorites App', () => {
  // generate a random username and password for the e2e tests
  const username = `e2euser${Math.floor(Math.random() * 1000)}`;
  const password = `e2epass${Math.floor(Math.random() * 1000)}`;
  const user = { username, password };

  beforeEach(() => {
    cy.visit('http://localhost:5173');
  });

  it('should allow a new user to register and login', () => {
    cy.contains('Create Account').click();
    cy.get('input[name="username"]').type(user.username);
    cy.get('input[name="password"]').type(user.password);
    cy.get('button#register').click();
    cy.contains('Registration successful! You can now log in.').should('exist');
    // wait for a bit to ensure the success message is visible
    cy.wait(2000);
    cy.get('input[name="username"]').type(user.username);
    cy.get('input[name="password"]').type(user.password);
    cy.get('button#login').click();
    cy.contains(`Hi, ${user.username}`).should('exist');
    cy.contains('Favorites').should('exist');
  });

  it('should show books and allow adding to favorites', () => {
    // Login first
    cy.contains('Login').click();
    cy.get('input[name="username"]').type(user.username);
    cy.get('input[name="password"]').type(user.password);
    cy.get('button#login').click();
    cy.contains('Books').click();
    cy.contains('h2', 'Books').should('exist');
    cy.get('button').contains('Add to Favorites').first().click();
    cy.get('a#favorites-link').click();
    cy.get('h2').contains('My Favorite Books').should('exist');
  });

  it('should remove favorites immediately, persist removal, and allow adding again', () => {
    cy.contains('Login').click();
    cy.get('input[name="username"]').type(user.username);
    cy.get('input[name="password"]').type(user.password);
    cy.get('button#login').click();
    cy.get('a#favorites-link').click();
    cy.get('li').should('have.length', 1);
    cy.get('li strong').invoke('text').then(title => {
      cy.intercept('DELETE', '**/api/favorites', {
        statusCode: 500,
        body: { message: 'Unable to save favorites' },
      }).as('failedRemoval');
      cy.contains('button', 'Remove from Favorites').click();
      cy.wait('@failedRemoval');
      cy.get('[role="alert"]').should('contain', 'Failed to remove favorite');
      cy.contains('li', title).should('exist');

      cy.intercept('DELETE', '**/api/favorites', req => req.continue()).as('removeFavorite');
      cy.contains('button', 'Remove from Favorites').click();
      cy.wait('@removeFavorite').its('response.statusCode').should('eq', 200);
      cy.contains('li', title).should('not.exist');
      cy.contains('No favorite books yet.').should('exist');
      cy.get('[role="alert"]').should('not.exist');
      cy.reload();
      cy.contains('No favorite books yet.').should('exist');

      cy.contains('book list').click();
      cy.contains('div', title).parent().within(() => {
        cy.contains('button', 'Add to Favorites').click();
        cy.contains('button', 'In Favorites').should('exist');
      });
      cy.get('a#favorites-link').click();
      cy.contains('li', title).should('exist');
    });
  });

  it('should logout and protect routes', () => {
    // Login first
    cy.contains('Login').click();
    cy.get('input[name="username"]').type(user.username);
    cy.get('input[name="password"]').type(user.password);
    cy.get('button#login').click();
    cy.get('button#logout').click();
    cy.contains('Login').should('exist');
    cy.visit('http://localhost:5173/books');
    cy.url().should('eq', 'http://localhost:5173/');
  });
});
