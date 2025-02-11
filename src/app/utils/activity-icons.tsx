// src/app/lib/utils/activity-icons.tsx
import { 
    FilePlus, 
    FileEdit, 
    Trash2, 
    LogIn
  } from 'lucide-react';
  
  export type ActivityType = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'LOGIN';
  
  export function getActivityIcon(type: ActivityType) {
    switch (type) {
      case 'CREATE':
        return <FilePlus className="h-4 w-4 text-green-500" />;
      case 'UPDATE':
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'IMPORT':
        return <FilePlus className="h-4 w-4 text-purple-500" />;
      case 'LOGIN':
        return <LogIn className="h-4 w-4 text-gray-500" />;
      default:
        return <FilePlus className="h-4 w-4 text-gray-500" />;
    }
  }