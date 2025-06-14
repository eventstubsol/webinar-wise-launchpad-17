import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Edit, Trash2, Copy, Plus, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'pdf' | 'excel' | 'powerpoint';
  sections: string[];
  isDefault: boolean;
  isPublic: boolean;
  usage_count: number;
  created_at: string;
}

export function ExportTemplateManager() {
  const [templates, setTemplates] = useState<ExportTemplate[]>([
    {
      id: '1',
      name: 'Executive Summary',
      description: 'High-level overview for executives',
      type: 'pdf',
      sections: ['overview', 'key_metrics', 'trends'],
      isDefault: true,
      isPublic: false,
      usage_count: 45,
      created_at: '2025-06-01'
    },
    {
      id: '2',
      name: 'Detailed Analysis',
      description: 'Comprehensive participant breakdown',
      type: 'excel',
      sections: ['overview', 'participants', 'engagement', 'polls', 'qa'],
      isDefault: false,
      isPublic: true,
      usage_count: 23,
      created_at: '2025-06-05'
    }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    type: 'pdf' as 'pdf' | 'excel' | 'powerpoint',
    sections: [] as string[],
    isDefault: false,
    isPublic: false
  });
  const { toast } = useToast();

  const availableSections = [
    { value: 'overview', label: 'Overview & Summary' },
    { value: 'key_metrics', label: 'Key Metrics' },
    { value: 'participants', label: 'Participant Details' },
    { value: 'engagement', label: 'Engagement Analysis' },
    { value: 'polls', label: 'Poll Results' },
    { value: 'qa', label: 'Q&A Interactions' },
    { value: 'trends', label: 'Trend Analysis' },
    { value: 'demographics', label: 'Demographics' },
    { value: 'raw_data', label: 'Raw Data Export' }
  ];

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setEditForm({
      name: '',
      description: '',
      type: 'pdf',
      sections: [],
      isDefault: false,
      isPublic: false
    });
    setIsEditing(true);
  };

  const handleEditTemplate = (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      description: template.description,
      type: template.type,
      sections: template.sections,
      isDefault: template.isDefault,
      isPublic: template.isPublic
    });
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    if (!editForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }

    if (editForm.sections.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one section must be selected",
        variant: "destructive"
      });
      return;
    }

    if (selectedTemplate) {
      // Update existing template
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id 
          ? { ...t, ...editForm }
          : t
      ));
      toast({
        title: "Template Updated",
        description: "Export template has been updated successfully"
      });
    } else {
      // Create new template
      const newTemplate: ExportTemplate = {
        id: Date.now().toString(),
        ...editForm,
        usage_count: 0,
        created_at: new Date().toISOString().split('T')[0]
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast({
        title: "Template Created",
        description: "New export template has been created successfully"
      });
    }

    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast({
      title: "Template Deleted",
      description: "Export template has been deleted successfully"
    });
  };

  const handleDuplicateTemplate = (template: ExportTemplate) => {
    const duplicated: ExportTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isDefault: false,
      usage_count: 0,
      created_at: new Date().toISOString().split('T')[0]
    };
    setTemplates(prev => [...prev, duplicated]);
    toast({
      title: "Template Duplicated",
      description: "Template has been duplicated successfully"
    });
  };

  const handleSectionToggle = (sectionValue: string) => {
    setEditForm(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionValue)
        ? prev.sections.filter(s => s !== sectionValue)
        : [...prev.sections, sectionValue]
    }));
  };

  const getSectionLabel = (value: string) => {
    return availableSections.find(s => s.value === value)?.label || value;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'excel': return '📊';
      case 'powerpoint': return '📽️';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Export Templates</h3>
        <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="sections">Content Sections</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Executive Summary Report"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Export Type</Label>
                    <Select value={editForm.type} onValueChange={(value: 'pdf' | 'excel' | 'powerpoint') => setEditForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">📄 PDF Report</SelectItem>
                        <SelectItem value="excel">📊 Excel Workbook</SelectItem>
                        <SelectItem value="powerpoint">📽️ PowerPoint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what this template includes..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sections" className="space-y-4">
                <div className="space-y-2">
                  <Label>Content Sections</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableSections.map(section => (
                      <div key={section.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={section.value}
                          checked={editForm.sections.includes(section.value)}
                          onChange={() => handleSectionToggle(section.value)}
                          className="rounded"
                        />
                        <Label htmlFor={section.value} className="text-sm">
                          {section.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="options" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Set as Default</Label>
                      <div className="text-sm text-gray-500">Use this template by default for new exports</div>
                    </div>
                    <Switch
                      checked={editForm.isDefault}
                      onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isDefault: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Make Public</Label>
                      <div className="text-sm text-gray-500">Allow other users to use this template</div>
                    </div>
                    <Switch
                      checked={editForm.isPublic}
                      onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isPublic: checked }))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSaveTemplate}>
                {selectedTemplate ? 'Update Template' : 'Create Template'}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(template.type)}</span>
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                  </div>
                  {template.isDefault && (
                    <Star className="h-4 w-4 text-yellow-500" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex flex-wrap gap-1">
                    {template.sections.slice(0, 3).map(section => (
                      <Badge key={section} variant="secondary" className="text-xs">
                        {getSectionLabel(section)}
                      </Badge>
                    ))}
                    {template.sections.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.sections.length - 3} more
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{template.usage_count} uses</span>
                    <span>{template.created_at}</span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {!template.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
