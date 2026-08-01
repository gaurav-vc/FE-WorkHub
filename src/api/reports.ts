import { apiClient } from './client';

export interface EmployeeStats {
  employee: {
    id: number;
    name: string;
    email: string;
  };
  kpis: {
    total_assigned: number;
    total_created: number;
    total_completed: number;
    total_delayed: number;
    total_issues: number;
  };
  trend_data: { date: string; completed: number }[];
  raw_tasks: any[];
}

export const fetchEmployeeReport = async (
  employeeId: string | string[], 
  filter?: string, 
  startDate?: string, 
  endDate?: string
): Promise<EmployeeStats> => {
  const ids = Array.isArray(employeeId) ? employeeId.join(',') : employeeId;
  let url = `/projects/reports/employee-stats/?employee_ids=${ids}`;
  if (filter) url += `&quick_filter=${filter}`;
  if (startDate && endDate) url += `&start_date=${startDate}&end_date=${endDate}`;
  
  const response = await apiClient(url);
  return response;
};
