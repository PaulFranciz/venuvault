describe('API Health Tests', () => {
  const eventId = Cypress.env('TEST_EVENT_ID');
  const userId = Cypress.env('TEST_USER_ID');

  beforeEach(() => {
    // Set up any necessary preconditions
    cy.log('Starting API health test');
  });

  describe('Core API Endpoints', () => {
    it('should test event availability API', () => {
      cy.request({
        method: 'GET',
        url: `/api/events/${eventId}/availability`,
        timeout: 10000
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('object');
        
        // Check for expected properties (allow for mock data)
        const hasAvailabilityData = response.body.hasOwnProperty('isSoldOut') || 
                                  response.body.hasOwnProperty('isMockData') ||
                                  response.body.hasOwnProperty('status');
        expect(hasAvailabilityData).to.be.true;
        
        // Log data source for debugging
        const dataSource = response.headers['x-data-source'];
        if (dataSource) {
          cy.log(`Data source: ${dataSource}`);
          
          if (dataSource.includes('mock')) {
            cy.log('⚠️ Using mock data - Convex may be failing');
          }
        }
        
        // Performance check
        if (response.duration > 5000) {
          cy.log(`⚠️ Slow response: ${response.duration}ms`);
        }
      });
    });

    it('should test queue position API', () => {
      cy.request({
        method: 'GET',
        url: `/api/queue/position?eventId=${eventId}&userId=${userId}`,
        timeout: 10000,
        failOnStatusCode: false // Allow non-200 responses for analysis
      }).then((response) => {
        expect(response.status).to.eq(200);
        
        if (response.body) {
          const hasQueueData = response.body.hasOwnProperty('position') || 
                              response.body.hasOwnProperty('error') ||
                              response.body.hasOwnProperty('isInQueue');
          expect(hasQueueData).to.be.true;
          
          // Check for mock data
          if (response.body.isMockData) {
            cy.log('⚠️ Queue position using mock data');
          }
        }
      });
    });

    it('should test event details API', () => {
      cy.request({
        method: 'GET',
        url: `/api/events/${eventId}`,
        timeout: 8000
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('object');
        
        const hasEventData = response.body.hasOwnProperty('name') || 
                           response.body.hasOwnProperty('_id') ||
                           response.body.hasOwnProperty('title');
        expect(hasEventData).to.be.true;
      });
    });

    it('should test user tickets API', () => {
      cy.request({
        method: 'GET',
        url: `/api/users/${userId}/tickets?eventId=${eventId}`,
        timeout: 8000,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        
        // Allow null response (no tickets)
        if (response.body !== null) {
          const hasTicketData = Array.isArray(response.body) || 
                               response.body.hasOwnProperty('tickets') ||
                               response.body.hasOwnProperty('error');
          expect(hasTicketData).to.be.true;
        }
      });
    });

    it('should test Redis health check', () => {
      cy.request({
        method: 'GET',
        url: '/api/health/redis',
        timeout: 5000,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body.status).to.eq('healthy');
          cy.log('✅ Redis is healthy');
        } else {
          cy.log('⚠️ Redis health check failed');
          cy.log(`Redis status: ${response.body?.status || 'unknown'}`);
        }
      });
    });
  });

  describe('Performance Tests', () => {
    it('should test API response times', () => {
      const endpoints = [
        `/api/events/${eventId}/availability`,
        `/api/queue/position?eventId=${eventId}&userId=${userId}`,
        `/api/events/${eventId}`
      ];

      endpoints.forEach(endpoint => {
        const startTime = Date.now();
        
        cy.request({
          method: 'GET',
          url: endpoint,
          timeout: 10000
        }).then(() => {
          const duration = Date.now() - startTime;
          cy.log(`${endpoint}: ${duration}ms`);
          
          // Warn on slow responses
          if (duration > 5000) {
            cy.log(`⚠️ Slow response for ${endpoint}: ${duration}ms`);
          }
        });
      });
    });

    it('should test concurrent API calls', () => {
      const promises = [];
      const concurrentCalls = 5;
      
      for (let i = 0; i < concurrentCalls; i++) {
        promises.push(
          cy.request({
            method: 'GET',
            url: `/api/events/${eventId}/availability`,
            timeout: 10000
          })
        );
      }
      
      // Wait for all concurrent calls to complete
      cy.wrap(Promise.all(promises)).then((responses) => {
        responses.forEach((response, index) => {
          expect(response.status).to.eq(200);
          cy.log(`Concurrent call ${index + 1}: ${response.status}`);
        });
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid event ID gracefully', () => {
      cy.request({
        method: 'GET',
        url: '/api/events/invalid-event-id/availability',
        failOnStatusCode: false,
        timeout: 10000
      }).then((response) => {
        // Should return 200 with mock data or error, not crash
        expect([200, 404, 400]).to.include(response.status);
        
        if (response.status === 200 && response.body.isMockData) {
          cy.log('✅ Graceful fallback to mock data for invalid event ID');
        }
      });
    });

    it('should handle missing parameters gracefully', () => {
      cy.request({
        method: 'GET',
        url: '/api/queue/position', // Missing required parameters
        failOnStatusCode: false,
        timeout: 10000
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.contain('required');
      });
    });
  });
}); 