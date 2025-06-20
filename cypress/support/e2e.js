// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for event-pulse testing
Cypress.Commands.add('testApiEndpoint', (endpoint, options = {}) => {
  const defaultOptions = {
    timeout: 10000,
    method: 'GET',
    failOnStatusCode: false
  };
  
  const requestOptions = { ...defaultOptions, ...options };
  
  return cy.request({
    url: endpoint,
    ...requestOptions
  }).then((response) => {
    // Log response details
    cy.log(`API Test: ${endpoint}`);
    cy.log(`Status: ${response.status}`);
    cy.log(`Duration: ${response.duration}ms`);
    
    const dataSource = response.headers['x-data-source'];
    if (dataSource) {
      cy.log(`Data Source: ${dataSource}`);
    }
    
    return response;
  });
});

// Custom command for testing with retries
Cypress.Commands.add('testWithRetry', (testFn, maxRetries = 3) => {
  let attempts = 0;
  
  function attempt() {
    attempts++;
    try {
      return testFn();
    } catch (error) {
      if (attempts < maxRetries) {
        cy.log(`Attempt ${attempts} failed, retrying...`);
        cy.wait(1000);
        return attempt();
      } else {
        throw error;
      }
    }
  }
  
  return attempt();
}); 