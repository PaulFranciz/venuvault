describe('Phantom Tickets Bug Verification', () => {
  beforeEach(() => {
    // Clear all browser data to simulate fresh user
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    
    // Clear IndexedDB if exists
    cy.window().then((win) => {
      if ('indexedDB' in win) {
        // Clear TanStack Query cache
        win.indexedDB.deleteDatabase('tanstack-query-cache');
      }
    });
  });

  it('should NOT show phantom tickets for fresh users', () => {
    // Visit an event page as a fresh user
    cy.visit('/event/jh72w4qzh8a143vfhy67m2nzy57j644n', {
      timeout: 30000
    });

    // Wait for page to fully load
    cy.get('[data-testid="event-title"], h1', { timeout: 15000 }).should('be.visible');

    // Should NOT see "You have a ticket!" message
    cy.get('body').should('not.contain.text', 'You have a ticket!');
    
    // Should NOT see "View Ticket" button for fresh user
    cy.get('button').should('not.contain.text', 'View Ticket');
    cy.get('button').should('not.contain.text', 'VIEW TICKET');
    
    // Should see "BUY NOW" or "GET TICKET" button instead
    cy.get('button').should(($buttons) => {
      const buttonTexts = Array.from($buttons).map(btn => btn.textContent?.trim().toLowerCase());
      const hasPurchaseButton = buttonTexts.some(text => 
        text?.includes('buy now') || 
        text?.includes('get ticket') || 
        text?.includes('view tickets')
      );
      expect(hasPurchaseButton).to.be.true;
    });

    // Check that no green "You have a ticket" sections exist
    cy.get('.bg-green-50, .bg-green-100').should('not.exist');
    
    // Verify no ticket-related success states are shown
    cy.get('[class*="green"]').should('not.contain.text', 'You have a ticket');
  });

  it('should handle user authentication flow correctly', () => {
    cy.visit('/event/jh72w4qzh8a143vfhy67m2nzy57j644n');
    
    // Initially should show sign-in flow or buy now button
    cy.get('button', { timeout: 10000 }).should('be.visible');
    
    // Should not immediately show any ticket ownership
    cy.wait(2000); // Wait for any async operations
    cy.get('body').should('not.contain.text', 'You have a ticket!');
  });

  it('should properly handle network loading states', () => {
    // Intercept API calls to simulate slow network
    cy.intercept('GET', '/api/users/*/tickets*', { delay: 3000 }).as('getUserTickets');
    cy.intercept('GET', '/api/events/*', { delay: 2000 }).as('getEvent');
    
    cy.visit('/event/jh72w4qzh8a143vfhy67m2nzy57j644n');
    
    // During loading, should not show phantom tickets
    cy.get('body').should('not.contain.text', 'You have a ticket!');
    
    // Wait for API calls to complete
    cy.wait('@getEvent', { timeout: 15000 });
    
    // After loading, still should not show phantom tickets
    cy.get('body').should('not.contain.text', 'You have a ticket!');
  });

  it('should verify cache is properly cleared between sessions', () => {
    // First visit - ensure no tickets shown
    cy.visit('/event/jh72w4qzh8a143vfhy67m2nzy57j644n');
    cy.get('body').should('not.contain.text', 'You have a ticket!');
    
    // Simulate refresh with cache clearing
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.reload();
    
    // Should still not show phantom tickets
    cy.get('body').should('not.contain.text', 'You have a ticket!');
  });

  it('should handle empty user ID edge cases', () => {
    // Test the specific bug where empty user IDs caused phantom tickets
    cy.visit('/event/jh72w4qzh8a143vfhy67m2nzy57j644n');
    
    // Mock scenario where user ID might be empty string or null
    cy.window().then((win) => {
      // Override user context if accessible for testing
      if (win.localStorage) {
        win.localStorage.removeItem('auth-token');
        win.localStorage.removeItem('user-id');
      }
    });
    
    cy.reload();
    
    // Even with empty/null user context, should not show phantom tickets
    cy.get('body').should('not.contain.text', 'You have a ticket!');
    cy.get('button').should('not.contain.text', 'View Ticket');
  });
}); 