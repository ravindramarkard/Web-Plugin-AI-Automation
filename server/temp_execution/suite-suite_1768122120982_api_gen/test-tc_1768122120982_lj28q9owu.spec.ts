import { test } from '../custom-test';
import { expect } from '@playwright/test';

const BASE_URL = 'https://petstore.swagger.io/v2';

test.describe('rrttt', () => {
  test('POST /pet - Add a new pet to the store - Success', async ({ request }) => {
    // Test data for a valid pet
    const petData = {
      id: 12345,
      category: {
        id: 1,
        name: 'Dogs',
      },
      name: 'Buddy',
      photoUrls: ['http://example.com/photos/buddy.jpg'],
      tags: [
        { id: 1, name: 'friendly' },
        { id: 2, name: 'playful' },
      ],
      status: 'available',
    };

    const response = await request.post(`${BASE_URL}/pet`, {
      data: petData,
    });

    // Expect a 200 OK response for successful addition
    expect(response.status()).toBe(200);
  });

  test('POST /pet - Add a new pet to the store - Invalid input', async ({ request }) => {
    // Test data with invalid structure (missing required fields)
    const invalidPetData = {
      name: 'InvalidPet',
      // Missing required fields like id, category, photoUrls
    };

    const response = await request.post(`${BASE_URL}/pet`, {
      data: invalidPetData,
    });

    // Expect a 405 Method Not Allowed response for invalid input
    expect(response.status()).toBe(405);
  });
});
