# End-to-End Flow Debug Guide

## Expected Flow:
1. User executes a prompt from Prompts tab
2. Navigator tracks all actions (go_to_url, click_element, input_text, done)
3. Task completes successfully (TASK_OK)
4. handleTaskCompletion is called
5. Playwright code is generated from tracked actions
6. Test case is automatically saved with playwrightCode
7. testCaseCreated event is dispatched
8. ProjectDetailPage receives event and reloads test cases
9. Test case appears in "ALL TESTS" → "UI Test cases" tab

## Key Files to Check:
- `pages/web-app/src/lib/webService.ts` - handleTaskCompletion function
- `pages/web-app/src/lib/actionTracker.ts` - Action tracking
- `pages/web-app/src/lib/testSuiteStorage.ts` - Test case storage
- `pages/web-app/src/pages/ProjectDetailPage.tsx` - Event handler and UI

## Debug Steps:
1. Check browser console for logs starting with [WebService], [ActionTracker], [TestSuiteStorage], [ProjectDetailPage]
2. Verify actionTracker.startTracking is called when task starts
3. Verify actions are tracked (check actionTracker.getSteps())
4. Verify playwrightCode is generated
5. Verify test case is saved with playwrightCode
6. Verify testCaseCreated event is dispatched
7. Verify ProjectDetailPage receives event and reloads test cases
8. Verify test cases appear in the table

