import { test, expect } from '@playwright/test';

// Test suite for API endpoints
test.describe('testapi', () => {
  const BASE_URL = 'http://localhost:5050';
  const API_TOKEN = process.env.API_TOKEN || 'your-bearer-token-here';

  // Helper function to create authorization headers
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  });

  // Test case: Add a new pet to the store (Positive)
  test('POST /pet - Add a new pet to the store (200 OK)', async ({ request }) => {
    // Sample pet data to be added
    const petData = {
      id: Math.floor(Math.random() * 1000000), // Random ID to avoid conflicts
      name: 'Buddy',
      category: {
        id: 1,
        name: 'Dogs',
      },
      photoUrls: ['http://example.com/dog.jpg'],
      tags: [{ id: 1, name: 'friendly' }],
      status: 'available',
    };

    // Make the POST request to add a new pet
    const response = await request.post(`${BASE_URL}/pet`, {
      headers: getAuthHeaders(),
      data: petData,
    });

    // Verify the response status is 200 OK
    expect(response.status()).toBe(200);

    // Verify the response body contains the added pet data
    const responseBody = await response.json();
    expect(responseBody).toMatchObject(petData);
  });

  // Test case: Add a new pet with invalid input (Negative)
  test('POST /pet - Add a new pet with invalid input (405 Method Not Allowed)', async ({ request }) => {
    // Invalid pet data (missing required fields)
    const invalidPetData = {
      name: '', // Empty name
      category: {},
      photoUrls: [],
      tags: [],
      status: 'invalid_status',
    };

    // Make the POST request with invalid data
    const response = await request.post(`${BASE_URL}/pet`, {
      headers: getAuthHeaders(),
      data: invalidPetData,
    });

    // Verify the response status is 405 Method Not Allowed as per the spec
    expect(response.status()).toBe(405);

    // Verify the response contains an error message
    const responseBody = await response.text();
    expect(responseBody).toContain('Invalid input');
  });

  // Test case: Add a new pet without authentication (Negative)
  test('POST /pet - Add a new pet without authentication (401 Unauthorized)', async ({ request }) => {
    // Sample pet data
    const petData = {
      id: Math.floor(Math.random() * 1000000),
      name: 'Max',
      category: {
        id: 2,
        name: 'Cats',
      },
      photoUrls: ['http://example.com/cat.jpg'],
      tags: [{ id: 2, name: 'playful' }],
      status: 'pending',
    };

    // Make the POST request without authorization headers
    const response = await request.post(`${BASE_URL}/pet`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: petData,
    });

    // Verify the response status is 401 Unauthorized
    expect(response.status()).toBe(401);
  });
});
