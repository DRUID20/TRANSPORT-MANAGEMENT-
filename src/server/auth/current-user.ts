/**
 * Mock "current user" helper.
 *
 * Until real auth is wired (Supabase Auth in Phase 0/9), the bell, inbox,
 * and any "this is for me" filtering uses this single fixed employee:
 * Faith Njeri (HR Manager, emp-004). She's the seed recipient of most
 * sample notifications.
 */

import { getEmployee } from "@/server/store/mock-store";

export const CURRENT_USER_EMPLOYEE_ID = "emp-004";

export function getCurrentEmployee() {
  return getEmployee(CURRENT_USER_EMPLOYEE_ID);
}
