/**
 * Government Mandatory Contributions Service
 * Based on 2024 Philippine Government Contribution Tables
 */

export interface ContributionResult {
  monthlySalary: number;
  sss: { employeeShare: number; employerShare: number; total: number };
  philhealth: { employeeShare: number; employerShare: number; total: number };
  pagibig: { employeeShare: number; employerShare: number; total: number };
  totalEmployeeDeductions: number;
  totalEmployerCost: number;
}

// SSS Contribution Table 2024
// https://www.sss.gov.ph/sss/appmanager/pages.do?page=contribution
function computeSSS(monthlySalary: number): { employeeShare: number; employerShare: number; total: number } {
  // SSS table: salary range → Monthly Salary Credit (MSC)
  // EE = 4.5% of MSC, ER = 9.5% of MSC (plus EC contribution)
  const SSS_BRACKETS = [
    { min: 0, max: 4249.99, msc: 4000 },
    { min: 4250, max: 4749.99, msc: 4500 },
    { min: 4750, max: 5249.99, msc: 5000 },
    { min: 5250, max: 5749.99, msc: 5500 },
    { min: 5750, max: 6249.99, msc: 6000 },
    { min: 6250, max: 6749.99, msc: 6500 },
    { min: 6750, max: 7249.99, msc: 7000 },
    { min: 7250, max: 7749.99, msc: 7500 },
    { min: 7750, max: 8249.99, msc: 8000 },
    { min: 8250, max: 8749.99, msc: 8500 },
    { min: 8750, max: 9249.99, msc: 9000 },
    { min: 9250, max: 9749.99, msc: 9500 },
    { min: 9750, max: 10249.99, msc: 10000 },
    { min: 10250, max: 10749.99, msc: 10500 },
    { min: 10750, max: 11249.99, msc: 11000 },
    { min: 11250, max: 11749.99, msc: 11500 },
    { min: 11750, max: 12249.99, msc: 12000 },
    { min: 12250, max: 12749.99, msc: 12500 },
    { min: 12750, max: 13249.99, msc: 13000 },
    { min: 13250, max: 13749.99, msc: 13500 },
    { min: 13750, max: 14249.99, msc: 14000 },
    { min: 14250, max: 14749.99, msc: 14500 },
    { min: 14750, max: 15249.99, msc: 15000 },
    { min: 15250, max: 15749.99, msc: 15500 },
    { min: 15750, max: 16249.99, msc: 16000 },
    { min: 16250, max: 16749.99, msc: 16500 },
    { min: 16750, max: 17249.99, msc: 17000 },
    { min: 17250, max: 17749.99, msc: 17500 },
    { min: 17750, max: 18249.99, msc: 18000 },
    { min: 18250, max: 18749.99, msc: 18500 },
    { min: 18750, max: 19249.99, msc: 19000 },
    { min: 19250, max: 19749.99, msc: 19500 },
    { min: 19750, max: 20249.99, msc: 20000 },
    { min: 20250, max: 20749.99, msc: 20500 },
    { min: 20750, max: 29999.99, msc: 29500 },
    { min: 30000, max: Infinity, msc: 30000 },
  ];

  const bracket = SSS_BRACKETS.find((b) => monthlySalary >= b.min && monthlySalary <= b.max);
  const msc = bracket?.msc ?? 30000;

  const employeeShare = Math.round(msc * 0.045 * 100) / 100;
  const employerShare = Math.round(msc * 0.095 * 100) / 100;

  return {
    employeeShare,
    employerShare,
    total: Math.round((employeeShare + employerShare) * 100) / 100,
  };
}

// PhilHealth 2024: 5% of basic salary, 50/50 split, max ₱5,000/month total
function computePhilHealth(monthlySalary: number): { employeeShare: number; employerShare: number; total: number } {
  const MIN_SALARY = 10000;
  const MAX_TOTAL = 5000;
  const RATE = 0.05;

  const effectiveSalary = Math.max(monthlySalary, MIN_SALARY);
  const total = Math.min(effectiveSalary * RATE, MAX_TOTAL);
  const share = Math.round((total / 2) * 100) / 100;

  return {
    employeeShare: share,
    employerShare: share,
    total: Math.round(total * 100) / 100,
  };
}

// Pag-IBIG 2024: 2% employee + 2% employer, employee max ₱200/month
function computePagIbig(monthlySalary: number): { employeeShare: number; employerShare: number; total: number } {
  const EE_RATE = 0.02;
  const ER_RATE = 0.02;
  const EE_MAX = 200;

  const employeeShare = Math.min(monthlySalary * EE_RATE, EE_MAX);
  const employerShare = monthlySalary * ER_RATE;

  return {
    employeeShare: Math.round(employeeShare * 100) / 100,
    employerShare: Math.round(employerShare * 100) / 100,
    total: Math.round((employeeShare + employerShare) * 100) / 100,
  };
}

export function computeContributions(monthlySalary: number): ContributionResult {
  const sss = computeSSS(monthlySalary);
  const philhealth = computePhilHealth(monthlySalary);
  const pagibig = computePagIbig(monthlySalary);

  const totalEmployeeDeductions =
    Math.round((sss.employeeShare + philhealth.employeeShare + pagibig.employeeShare) * 100) / 100;

  const totalEmployerCost =
    Math.round((sss.employerShare + philhealth.employerShare + pagibig.employerShare) * 100) / 100;

  return {
    monthlySalary,
    sss,
    philhealth,
    pagibig,
    totalEmployeeDeductions,
    totalEmployerCost,
  };
}

export function getContributionDeadlines(year: number, month: number): Array<{ type: string; deadline: string; description: string }> {
  // Deadlines are generally the 10th of the following month for most contributions
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const pad = (n: number) => String(n).padStart(2, "0");
  const deadlineDate = `${nextYear}-${pad(nextMonth)}-10`;

  return [
    {
      type: "SSS",
      deadline: deadlineDate,
      description: "SSS monthly contribution remittance",
    },
    {
      type: "PhilHealth",
      deadline: deadlineDate,
      description: "PhilHealth monthly premium remittance",
    },
    {
      type: "Pag-IBIG",
      deadline: deadlineDate,
      description: "Pag-IBIG monthly contribution remittance",
    },
  ];
}
