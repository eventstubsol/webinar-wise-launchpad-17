
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Table, Presentation } from 'lucide-react';

interface ExportType {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const exportTypes: ExportType[] = [
  { id: 'pdf', label: 'PDF Report', icon: FileText, description: 'Professional report with charts' },
  { id: 'excel', label: 'Excel Export', icon: Table, description: 'Raw data with analytics' },
  { id: 'powerpoint', label: 'PowerPoint', icon: Presentation, description: 'Executive presentation' }
];

interface ReportFormatSelectionProps {
  selectedFormats: string[];
  onFormatToggle: (format: string) => void;
}

export function ReportFormatSelection({ selectedFormats, onFormatToggle }: ReportFormatSelectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {exportTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selectedFormats.includes(type.id);
        
        return (
          <Card 
            key={type.id}
            className={`cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onFormatToggle(type.id)}
          >
            <CardContent className="p-4 text-center">
              <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
              <h4 className="font-medium mb-1">{type.label}</h4>
              <p className="text-sm text-gray-600">{type.description}</p>
              {isSelected && (
                <Badge variant="secondary" className="mt-2">Selected</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
