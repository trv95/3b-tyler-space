export type Employee = {
  employeeId: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  managerName: string | null;
  managerEmail: string | null;
};

type DirectoryEntry = {
  id: string;
  displayName: string | null;
  workEmail: string | null;
  department: string | null;
  jobTitle: string | null;
  supervisor: string | null;
};

export async function lookupEmployee(email: string): Promise<Employee | null> {
  const subdomain = process.env.BAMBOO_HR_SUBDOMAIN;
  const response = await fetch(
    `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees/directory`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`BambooHR directory failed: ${response.status}`);
  const directory = (await response.json()) as { employees: DirectoryEntry[] };
  const target = email.trim().toLowerCase();
  const person = directory.employees.find((e) => (e.workEmail ?? "").toLowerCase() === target);
  if (!person) return null;
  const manager = person.supervisor
    ? directory.employees.find((e) => (e.displayName ?? "") === person.supervisor)
    : undefined;
  return {
    employeeId: person.id,
    name: person.displayName ?? email,
    email: person.workEmail ?? email,
    department: person.department,
    jobTitle: person.jobTitle,
    managerName: person.supervisor,
    managerEmail: manager?.workEmail ?? null,
  };
}
