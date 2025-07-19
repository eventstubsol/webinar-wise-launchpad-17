
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { CRMConnection, CRMFieldMapping } from '@/types/crm';
import { CRMConnectionManager } from '@/services/crm/CRMConnectionManager';
import { useToast } from '@/hooks/use-toast';

interface CRMFieldMappingInterfaceProps {
  connection: CRMConnection;
}

export function CRMFieldMappingInterface({ connection }: CRMFieldMappingInterfaceProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<CRMFieldMapping[]>([]);
  const [availableFields, setAvailableFields] = useState<{ name: string; label: string; type: string; required: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMapping, setEditingMapping] = useState<Partial<CRMFieldMapping> | null>(null);

  const webinarFields = [
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'first_name', label: 'First Name', type: 'string' },
    { name: 'last_name', label: 'Last Name', type: 'string' },
    { name: 'organization', label: 'Organization', type: 'string' },
    { name: 'job_title', label: 'Job Title', type: 'string' },
    { name: 'phone', label: 'Phone', type: 'phone' },
    { name: 'city', label: 'City', type: 'string' },
    { name: 'state_province', label: 'State/Province', type: 'string' },
    { name: 'country', label: 'Country', type: 'string' },
    { name: 'registration_time', label: 'Registration Time', type: 'datetime' },
    { name: 'join_time', label: 'Join Time', type: 'datetime' },
    { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number' }
  ];

  useEffect(() => {
    loadMappings();
    loadAvailableFields();
  }, [connection.id]);

  const loadMappings = async () => {
    try {
      const data = await CRMConnectionManager.getFieldMappings(connection.id);
      setMappings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load field mappings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFields = async () => {
    try {
      const fields = await CRMConnectionManager.getAvailableFields(connection.id);
      setAvailableFields(fields);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load CRM fields",
        variant: "destructive",
      });
    }
  };

  const handleSaveMapping = async () => {
    if (!editingMapping?.webinar_field || !editingMapping?.crm_field) {
      toast({
        title: "Error",
        description: "Please select both webinar and CRM fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const mappingData = {
        connection_id: connection.id,
        webinar_field: editingMapping.webinar_field,
        crm_field: editingMapping.crm_field,
        crm_object_type: editingMapping.crm_object_type || 'Contact',
        sync_direction: editingMapping.sync_direction || 'bidirectional',
        is_required: editingMapping.is_required || false,
        default_value: editingMapping.default_value || '',
        transformation_rules: editingMapping.transformation_rules || {},
        conflict_resolution: editingMapping.conflict_resolution || 'last_write_wins'
      };

      if (editingMapping.id) {
        await CRMConnectionManager.updateFieldMapping(editingMapping.id, mappingData);
      } else {
        await CRMConnectionManager.createFieldMapping(mappingData);
      }

      toast({
        title: "Success",
        description: "Field mapping saved successfully",
      });

      setEditingMapping(null);
      loadMappings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save field mapping",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await CRMConnectionManager.deleteFieldMapping(mappingId);
      toast({
        title: "Success",
        description: "Field mapping deleted successfully",
      });
      loadMappings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete field mapping",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">Loading field mappings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Field Mappings</CardTitle>
          <CardDescription>
            Map webinar participant fields to your CRM fields for seamless data synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mappings.map((mapping) => (
              <div key={mapping.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">
                    {webinarFields.find(f => f.name === mapping.webinar_field)?.label || mapping.webinar_field}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">
                    {availableFields.find(f => f.name === mapping.crm_field)?.label || mapping.crm_field}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {mapping.sync_direction} • {mapping.conflict_resolution}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMapping(mapping)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMapping(mapping.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {mappings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No field mappings configured. Add your first mapping below.
              </div>
            )}
          </div>

          <Button
            className="mt-4"
            onClick={() => setEditingMapping({
              sync_direction: 'bidirectional',
              conflict_resolution: 'last_write_wins',
              crm_object_type: 'Contact'
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field Mapping
          </Button>
        </CardContent>
      </Card>

      {editingMapping && (
        <Card>
          <CardHeader>
            <CardTitle>{editingMapping.id ? 'Edit' : 'Add'} Field Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Webinar Field</Label>
                <Select
                  value={editingMapping.webinar_field}
                  onValueChange={(value) => setEditingMapping(prev => ({ ...prev, webinar_field: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select webinar field" />
                  </SelectTrigger>
                  <SelectContent>
                    {webinarFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>CRM Field</Label>
                <Select
                  value={editingMapping.crm_field}
                  onValueChange={(value) => setEditingMapping(prev => ({ ...prev, crm_field: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CRM field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label} {field.required && '*'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sync Direction</Label>
                <Select
                  value={editingMapping.sync_direction}
                  onValueChange={(value: any) => setEditingMapping(prev => ({ ...prev, sync_direction: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">Bidirectional</SelectItem>
                    <SelectItem value="outgoing">To CRM Only</SelectItem>
                    <SelectItem value="incoming">From CRM Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Conflict Resolution</Label>
                <Select
                  value={editingMapping.conflict_resolution}
                  onValueChange={(value: any) => setEditingMapping(prev => ({ ...prev, conflict_resolution: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_write_wins">Last Write Wins</SelectItem>
                    <SelectItem value="manual_review">Manual Review</SelectItem>
                    <SelectItem value="crm_wins">CRM Wins</SelectItem>
                    <SelectItem value="webinar_wins">Webinar Wins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Default Value (Optional)</Label>
              <Input
                value={editingMapping.default_value || ''}
                onChange={(e) => setEditingMapping(prev => ({ ...prev, default_value: e.target.value }))}
                placeholder="Default value when field is empty"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingMapping(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveMapping}>
                Save Mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
