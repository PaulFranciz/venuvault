// Custom commands for Event Pulse testing

// Add Cypress Testing Library commands
// import '@testing-library/cypress/add-commands'

// Example custom command
// Cypress.Commands.add('login', (email, password) => { ... })

// Command to check API health
Cypress.Commands.add('checkApiHealth', () => {
  const eventId = Cypress.env('TEST_EVENT_ID');
  const userId = Cypress.env('TEST_USER_ID');
  
  const endpoints = [
    `/api/events/${eventId}/availability`,
    `/api/queue/position?eventId=${eventId}&userId=${userId}`,
    `/api/events/${eventId}`,
    '/api/health/redis'
  ];
  
  const results = {};
  
  return cy.wrap(endpoints).each((endpoint) => {
    return cy.request({
      method: 'GET',
      url: endpoint,
      timeout: 10000,
      failOnStatusCode: false
    }).then((response) => {
      results[endpoint] = {
        status: response.status,
        duration: response.duration,
        dataSource: response.headers['x-data-source'],
        hasBody: !!response.body
      };
    });
  }).then(() => {
    return results;
  });
});

// Command to wait for API readiness
Cypress.Commands.add('waitForApiReady', (maxAttempts = 10) => {
  let attempts = 0;
  
  function checkHealth() {
    attempts++;
    
    return cy.request({
      method: 'GET',
      url: '/api/health/redis',
      timeout: 5000,
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200 && response.body.status === 'healthy') {
        cy.log('✅ API is ready');
        return true;
      } else if (attempts < maxAttempts) {
        cy.log(`⏳ Waiting for API (attempt ${attempts}/${maxAttempts})`);
        cy.wait(2000);
        return checkHealth();
      } else {
        cy.log('⚠️ API not ready after maximum attempts');
        return false;
      }
    });
  }
  
  return checkHealth();
}); 