
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { CSVUploadData } from '../CSVUploadWizard';

interface CSVFieldMappingProps {
  uploadData: CSVUploadData;
  updateUploadData: (updates: Partial<CSVUploadData>) => void;
}

const fieldSchemas = {
  participants: {
    required: ['first_name', 'last_name', 'email'],
    optional: ['organization', 'job_title', 'phone', 'city', 'state_province', 'country'],
    descriptions: {
      first_name: 'First name of the participant',
      last_name: 'Last name of the participant',
      email: 'Email address (must be unique)',
      organization: 'Company or organization name',
      job_title: 'Job title or position',
      phone: 'Phone number (can include country code)',
      city: 'City name',
      state_province: 'State or province',
      country: 'Country name'
    }
  },
  webinars: {
    required: ['title', 'start_time'],
    optional: ['description', 'duration_minutes', 'host_email', 'registrant_count', 'attendee_count'],
    descriptions: {
      title: 'Webinar title',
      description: 'Webinar description',
      start_time: 'Start date and time (YYYY-MM-DD HH:MM:SS)',
      duration_minutes: 'Duration in minutes',
      host_email: 'Host email address',
      registrant_count: 'Number of registrants',
      attendee_count: 'Number of attendees'
    }
  },
  participations: {
    required: ['webinar_title', 'participant_email'],
    optional: ['registration_time', 'join_time', 'leave_time', 'participation_status'],
    descriptions: {
      webinar_title: 'Webinar title (must match existing webinar)',
      participant_email: 'Participant email (must match existing participant)',
      registration_time: 'Registration date and time',
      join_time: 'Join date and time',
      leave_time: 'Leave date and time',
      participation_status: 'Status: registered, attended, no_show'
    }
  }
};

export function CSVFieldMapping({ uploadData, updateUploadData }: CSVFieldMappingProps) {
  const schema = fieldSchemas[uploadData.importType];
  const allFields = [...schema.required, ...schema.optional];

  const handleFieldMapping = (csvColumn: string, targetField: string) => {
    const newMapping = { ...uploadData.fieldMapping };
    
    // Remove this target field from any existing mappings
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key] === targetField) {
        delete newMapping[key];
      }
    });
    
    // Set the new mapping
    if (targetField === 'unmapped') {
      delete newMapping[csvColumn];
    } else {
      newMapping[csvColumn] = targetField;
    }
    
    updateUploadData({ fieldMapping: newMapping });
  };

  const getMappedField = (csvColumn: string) => {
    return uploadData.fieldMapping[csvColumn] || 'unmapped';
  };

  const getUnmappedRequiredFields = () => {
    const mappedFields = Object.values(uploadData.fieldMapping);
    return schema.required.filter(field => !mappedFields.includes(field));
  };

  const suggestMapping = () => {
    const suggestions: Record<string, string> = {};
    
    uploadData.headers.forEach(header => {
      const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Exact matches
      if (allFields.includes(headerLower)) {
        suggestions[header] = headerLower;
        return;
      }
      
      // Common variations
      const variations: Record<string, string[]> = {
        first_name: ['firstname', 'fname', 'first', 'given_name'],
        last_name: ['lastname', 'lname', 'last', 'surname', 'family_name'],
        email: ['email_address', 'e_mail', 'mail'],
        organization: ['company', 'org', 'employer', 'business'],
        job_title: ['title', 'position', 'role', 'jobtitle'],
        phone: ['phone_number', 'telephone', 'mobile', 'cell'],
        city: ['location', 'town'],
        state_province: ['state', 'province', 'region'],
        country: ['nation', 'nationality']
      };
      
      for (const [targetField, aliases] of Object.entries(variations)) {
        if (aliases.some(alias => headerLower.includes(alias))) {
          suggestions[header] = targetField;
          break;
        }
      }
    });
    
    updateUploadData({ fieldMapping: suggestions });
  };

  const unmappedRequired = getUnmappedRequiredFields();
  const canProceed = unmappedRequired.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Step 2: Map CSV Columns to Fields</h3>
        <button
          onClick={suggestMapping}
          className="text-sm text-blue-600 hover:text-blue-700 underline"
        >
          Auto-suggest mappings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">CSV Columns ({uploadData.headers.length})</h4>
            <div className="space-y-3">
              {uploadData.headers.map((header, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{header}</div>
                    <div className="text-sm text-gray-500">
                      Sample: {uploadData.previewData[0]?.[header] || 'No data'}
                    </div>
                  </div>
                  <Select
                    value={getMappedField(header)}
                    onValueChange={(value) => handleFieldMapping(header, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">
                        <span className="text-gray-500">Unmapped</span>
                      </SelectItem>
                      {schema.required.map(field => (
                        <SelectItem key={field} value={field}>
                          <div className="flex items-center">
                            <span>{field}</span>
                            <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                          </div>
                        </SelectItem>
                      ))}
                      {schema.optional.map(field => (
                        <SelectItem key={field} value={field}>
                          <div className="flex items-center">
                            <span>{field}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">Field Requirements</h4>
            
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium mb-2 text-red-600">Required Fields</h5>
                <div className="space-y-2">
                  {schema.required.map(field => {
                    const isMapped = Object.values(uploadData.fieldMapping).includes(field);
                    return (
                      <div key={field} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{field}</div>
                          <div className="text-sm text-gray-500">
                            {schema.descriptions[field]}
                          </div>
                        </div>
                        {isMapped ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium mb-2 text-blue-600">Optional Fields</h5>
                <div className="space-y-2">
                  {schema.optional.map(field => {
                    const isMapped = Object.values(uploadData.fieldMapping).includes(field);
                    return (
                      <div key={field} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{field}</div>
                          <div className="text-sm text-gray-500">
                            {schema.descriptions[field]}
                          </div>
                        </div>
                        {isMapped && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {!canProceed && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-red-700">
                    Missing required field mappings
                  </span>
                </div>
                <div className="text-sm text-red-600 mt-1">
                  Please map the following required fields: {unmappedRequired.join(', ')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
