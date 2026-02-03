import { TaskSpec, Step, CriticOutput, VerifierOutput } from './types.js';

export function validateTaskSpec(obj: any): obj is TaskSpec {
  if (typeof obj !== 'object' || obj === null) return false;
  
  if (typeof obj.app_name !== 'string' || obj.app_name.length === 0) return false;
  if (!/^[a-zA-Z0-9_]+$/.test(obj.app_name)) return false;
  
  if (!Array.isArray(obj.features) || obj.features.length === 0 || obj.features.length > 10) return false;
  if (!obj.features.every((f: any) => typeof f === 'string' && f.length > 0)) return false;
  
  if (!['MVVM', 'MVP', 'MVI'].includes(obj.architecture)) return false;
  if (!['Views', 'Compose'].includes(obj.ui_system)) return false;
  
  if (typeof obj.min_sdk !== 'number' || obj.min_sdk < 21 || obj.min_sdk > 34) return false;
  if (typeof obj.target_sdk !== 'number' || obj.target_sdk < obj.min_sdk || obj.target_sdk > 34) return false;
  
  if (typeof obj.gradle_version !== 'string' || !/^\d+\.\d+\.\d+$/.test(obj.gradle_version)) return false;
  if (typeof obj.kotlin_version !== 'string' || !/^\d+\.\d+\.\d+$/.test(obj.kotlin_version)) return false;
  
  return true;
}

export function validatePlan(plan: any): plan is Step[] {
  if (!Array.isArray(plan) || plan.length === 0 || plan.length > 25) return false;
  
  const stepNumbers = new Set<number>();
  
  for (const step of plan) {
    if (typeof step !== 'object' || step === null) return false;
    
    if (typeof step.step_number !== 'number' || step.step_number < 1) return false;
    if (stepNumbers.has(step.step_number)) return false;
    stepNumbers.add(step.step_number);
    
    if (!['foundation', 'feature', 'integration', 'finalization'].includes(step.phase)) return false;
    
    if (typeof step.file_path !== 'string' || step.file_path.length === 0) return false;
    if (step.file_path.startsWith('/') || step.file_path.includes('..')) return false;
    
    if (!['kotlin', 'xml', 'gradle', 'manifest'].includes(step.file_type)) return false;
    
    if (!Array.isArray(step.dependencies)) return false;
    for (const dep of step.dependencies) {
      if (typeof dep !== 'number' || !stepNumbers.has(dep)) return false;
    }
    
    if (typeof step.description !== 'string' || step.description.length === 0) return false;
  }
  
  return true;
}

export function validateCriticOutput(obj: any): obj is CriticOutput {
  if (typeof obj !== 'object' || obj === null) return false;
  
  if (!['ACCEPT', 'REJECT'].includes(obj.decision)) return false;
  
  if (!Array.isArray(obj.issues)) return false;
  for (const issue of obj.issues) {
    if (typeof issue !== 'object' || issue === null) return false;
    if (!['BLOCKER', 'MAJOR', 'MINOR'].includes(issue.severity)) return false;
    if (issue.line !== null && typeof issue.line !== 'number') return false;
    if (typeof issue.message !== 'string') return false;
  }
  
  return true;
}

export function validateVerifierOutput(obj: any): obj is VerifierOutput {
  if (typeof obj !== 'object' || obj === null) return false;
  
  if (!Array.isArray(obj.warnings)) return false;
  if (!obj.warnings.every((w: any) => typeof w === 'string')) return false;
  
  if (!Array.isArray(obj.missing_items)) return false;
  if (!obj.missing_items.every((m: any) => typeof m === 'string')) return false;
  
  if (typeof obj.quality_score !== 'number' || obj.quality_score < 0 || obj.quality_score > 1) return false;
  
  return true;
}

export function sanitizeFilePath(path: string): string {
  if (path.startsWith('/')) throw new Error('Absolute paths not allowed');
  if (path.includes('..')) throw new Error('Path traversal not allowed');
  return path;
}
