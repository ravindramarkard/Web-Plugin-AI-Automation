import { API_ENDPOINTS } from './apiConfig';

export async function startCodegen(
  url: string,
  name: string,
  projectId: string,
  testSuiteId?: string | null,
): Promise<{ success: boolean; testCaseId: string }> {
  const response = await fetch(`${API_ENDPOINTS.testGen}/codegen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      name,
      projectId,
      testSuiteId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start codegen');
  }

  return await response.json();
}
