import { test } from '../custom-test';
import { expect } from '@playwright/test';

test.describe('inventory-e2e', () => {
  const BASE_URL = 'http://localhost:5050';
  const API_KEY = process.env.API_TOKEN || 'your-api-key-here';

  // Helper function to create a valid order payload
  const createOrderPayload = (petId: number) => ({
    petId,
    quantity: 1,
    shipDate: new Date().toISOString(),
    status: 'placed',
    complete: false,
  });

  // Chained E2E scenario: Create Order -> Get Order -> Update Order -> Delete Order
  test('Complete order lifecycle', async ({ request }) => {
    // Step 1: Place an order for a pet
    const petId = 123; // Using a sample pet ID
    const orderPayload = createOrderPayload(petId);

    const createOrderResponse = await request.post(`${BASE_URL}/store/order`, {
      data: orderPayload,
      headers: {
        'Content-Type': 'application/json',
        api_key: API_KEY,
      },
    });

    expect(createOrderResponse.status()).toBe(200);
    const createdOrder = await createOrderResponse.json();
    expect(createdOrder.petId).toBe(petId);
    expect(createdOrder.status).toBe('placed');
    expect(createdOrder.id).toBeDefined();

    const orderId = createdOrder.id;
    console.log(`Created order with ID: ${orderId}`);

    // Step 2: Retrieve the created order
    const getOrderResponse = await request.get(`${BASE_URL}/store/order/${orderId}`, {
      headers: {
        api_key: API_KEY,
      },
    });

    expect(getOrderResponse.status()).toBe(200);
    const retrievedOrder = await getOrderResponse.json();
    expect(retrievedOrder.id).toBe(orderId);
    expect(retrievedOrder.petId).toBe(petId);

    // Step 3: Update the order status
    const updatedOrderPayload = {
      ...retrievedOrder,
      status: 'approved',
      complete: true,
    };

    const updateOrderResponse = await request.put(`${BASE_URL}/store/order/${orderId}`, {
      data: updatedOrderPayload,
      headers: {
        'Content-Type': 'application/json',
        api_key: API_KEY,
      },
    });

    expect(updateOrderResponse.status()).toBe(200);
    const updatedOrder = await updateOrderResponse.json();
    expect(updatedOrder.status).toBe('approved');
    expect(updatedOrder.complete).toBe(true);

    // Step 4: Verify the order was updated
    const verifyOrderResponse = await request.get(`${BASE_URL}/store/order/${orderId}`, {
      headers: {
        api_key: API_KEY,
      },
    });

    expect(verifyOrderResponse.status()).toBe(200);
    const verifiedOrder = await verifyOrderResponse.json();
    expect(verifiedOrder.status).toBe('approved');
    expect(verifiedOrder.complete).toBe(true);

    // Note: Delete endpoint not available in provided specs, so lifecycle ends with verification
  });

  test('Place order with invalid data should return 400', async ({ request }) => {
    const invalidOrderPayload = {
      petId: null,
      quantity: -1,
      status: 'invalid_status',
    };

    const response = await request.post(`${BASE_URL}/store/order`, {
      data: invalidOrderPayload,
      headers: {
        'Content-Type': 'application/json',
        api_key: API_KEY,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('Get non-existent order should return 404', async ({ request }) => {
    const nonExistentOrderId = 999999;

    const response = await request.get(`${BASE_URL}/store/order/${nonExistentOrderId}`, {
      headers: {
        api_key: API_KEY,
      },
    });

    expect(response.status()).toBe(404);
  });
});
