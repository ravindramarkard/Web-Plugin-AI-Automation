import { test as base, expect } from '@playwright/test';
export * from '@playwright/test';

export const test = base.extend({
  request: async ({ request }, use, testInfo) => {
    const wrappedRequest = new Proxy(request, {
      get: (target, prop, receiver) => {
        const originalMethod = Reflect.get(target, prop, receiver);
        if (
          typeof originalMethod === 'function' &&
          ['get', 'post', 'put', 'delete', 'patch', 'head', 'fetch'].includes(prop as string)
        ) {
          return async (...args: any[]) => {
            const url = args[0];
            const options = args[1] || {};

            const method = prop.toString().toUpperCase();

            // Log Request
            try {
              const reqData = {
                headers: options.headers,
                params: options.params,
                data: options.data,
              };
              await testInfo.attach(`Request: ${method} ${url}`, {
                body: JSON.stringify(reqData, null, 2),
                contentType: 'application/json',
              });
            } catch (e) {
              console.error('Failed to attach request log', e);
            }

            const response = await originalMethod.apply(target, args);

            // Log Response
            try {
              let responseBody = '';
              let responseContentType = 'text/plain';
              try {
                const buffer = await response.body();
                responseBody = buffer.toString('utf-8');
                try {
                  const json = JSON.parse(responseBody);
                  responseBody = JSON.stringify(json, null, 2);
                  responseContentType = 'application/json';
                } catch {}
              } catch (e) {
                responseBody = '[Body not available]';
              }

              await testInfo.attach(`Response: ${response.status()} ${method} ${url}`, {
                body: responseBody,
                contentType: responseContentType,
              });
            } catch (e) {
              console.error('Failed to attach response log', e);
            }

            return response;
          };
        }
        return originalMethod;
      },
    });

    await use(wrappedRequest);
  },
});
